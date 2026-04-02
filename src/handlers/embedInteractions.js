const { 
    EmbedBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const embedManager = require('../../utils/embedManager');
const { showEditPanel } = require('./embed');

/**
 * Handler de interações do sistema de embeds
 * Processa cliques em botões, modais e select menus
 */

/**
 * Processa interações de botões
 */
async function handleButtonInteraction(interaction, client) {
    const customId = interaction.customId;
    const userId = interaction.user.id;

    try {
        // Botões de criação rápida
        if (customId === 'embed_quick_create') {
            await handleCreate(interaction, client);
            return;
        }

        if (customId === 'embed_create_new') {
            await handleCreate(interaction, client);
            return;
        }

        if (customId === 'embed_refresh_list') {
            await handleList(interaction, userId);
            return;
        }

        // Botões de confirmação de deleção
        if (customId.startsWith('embed_confirm_delete_')) {
            const embedId = customId.replace('embed_confirm_delete_', '');
            await confirmDelete(interaction, embedId, userId);
            return;
        }

        if (customId === 'embed_cancel_delete') {
            await interaction.update({
                content: '❌ Deleção cancelada.',
                embeds: [],
                components: []
            });
            return;
        }

        // Botões de edição
        if (customId.startsWith('embed_edit_')) {
            const parts = customId.split('_');
            const action = parts[2];
            const embedId = parts[3];
            
            await handleEditAction(interaction, action, embedId, client);
            return;
        }

        // Botões de ação final
        if (customId.startsWith('embed_save_')) {
            const embedId = customId.replace('embed_save_', '');
            await handleSave(interaction, embedId, userId);
            return;
        }

        if (customId.startsWith('embed_send_')) {
            const embedId = customId.replace('embed_send_', '');
            await handleQuickSend(interaction, embedId, userId);
            return;
        }

        if (customId.startsWith('embed_preview_')) {
            const embedId = customId.replace('embed_preview_', '');
            await handleQuickPreview(interaction, embedId, userId);
            return;
        }

        if (customId.startsWith('embed_cancel_')) {
            const embedId = customId.replace('embed_cancel_', '');
            await handleCancel(interaction, embedId, userId);
            return;
        }

    } catch (error) {
        console.error('❌ Erro ao processar interação de botão:', error);
        await interaction.update({
            content: '❌ Ocorreu um erro ao processar esta ação.',
            embeds: [],
            components: []
        });
    }
}

/**
 * Processa interações de select menu
 */
async function handleSelectMenuInteraction(interaction, client) {
    const customId = interaction.customId;
    const userId = interaction.user.id;

    try {
        if (customId === 'embed_select') {
            const embedId = interaction.values[0];
            const embed = embedManager.getEmbed(embedId);

            if (!embed || embed.authorId !== userId) {
                await interaction.update({
                    content: '❌ Embed não encontrada ou sem permissão.',
                    embeds: [],
                    components: []
                });
                return;
            }

            await showEditPanel(interaction, embedId, client, false);
            return;
        }

        if (customId === 'color_select') {
            const embedId = interaction.values[0].split('_')[1];
            const colorName = interaction.values[0].split('_')[0];
            
            await updateEmbedColor(interaction, embedId, colorName, userId);
            return;
        }

        if (customId === 'template_select') {
            const templateName = interaction.values[0];
            await applyTemplate(interaction, templateName, userId);
            return;
        }

    } catch (error) {
        console.error('❌ Erro ao processar select menu:', error);
        await interaction.update({
            content: '❌ Ocorreu um erro ao processar esta seleção.',
            embeds: [],
            components: []
        });
    }
}

/**
 * Processa interações de modais
 */
async function handleModalSubmit(interaction, client) {
    const customId = interaction.customId;
    const userId = interaction.user.id;

    try {
        const parts = customId.split('_');
        const action = parts[2];
        const embedId = parts[3];

        switch (action) {
            case 'title':
                await updateEmbedTitle(interaction, embedId, userId);
                break;
            case 'description':
                await updateEmbedDescription(interaction, embedId, userId);
                break;
            case 'thumbnail':
                await updateEmbedThumbnail(interaction, embedId, userId);
                break;
            case 'image':
                await updateEmbedImage(interaction, embedId, userId);
                break;
            case 'author':
                await updateEmbedAuthor(interaction, embedId, userId);
                break;
            case 'footer':
                await updateEmbedFooter(interaction, embedId, userId);
                break;
            case 'field':
                await updateEmbedField(interaction, embedId, userId);
                break;
        }

    } catch (error) {
        console.error('❌ Erro ao processar modal:', error);
        await interaction.reply({
            content: '❌ Ocorreu um erro ao salvar as alterações.',
            ephemeral: true
        });
    }
}

/**
 * Manipuladores específicos
 */

async function handleCreate(interaction, client) {
    const result = embedManager.createEmbed(interaction.user.id, {
        title: '',
        description: '',
        color: embedManager.getColor('primary'),
        fields: [],
        thumbnail: null,
        image: null,
        author: null,
        footer: { text: 'Sistema de Embeds v2.0', iconURL: null }
    });

    if (!result.success) {
        return await interaction.update({
            content: `❌ ${result.error}`,
            embeds: [],
            components: []
        });
    }

    await showEditPanel(interaction, result.embedId, client, true);
}

async function handleList(interaction, userId) {
    const embeds = embedManager.listUserEmbeds(userId);
    const stats = embedManager.getStats(userId);

    if (embeds.length === 0) {
        const emptyEmbed = new EmbedBuilder()
            .setColor(embedManager.getColor('info'))
            .setTitle('📝 Nenhuma Embed Encontrada')
            .setDescription('Você ainda não criou nenhuma embed.')
            .setFooter({ text: 'Sistema de Embeds v2.0' })
            .setTimestamp();

        const createAction = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('embed_quick_create')
                .setLabel('✨ Criar Primeira Embed')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎨')
        );

        return await interaction.update({
            embeds: [emptyEmbed],
            components: [createAction]
        });
    }

    // Reconstruir lista (simplificado para atualização)
    const listEmbed = new EmbedBuilder()
        .setColor(embedManager.getColor('primary'))
        .setTitle('📝 Suas Embeds')
        .setDescription(`Você tem **${embeds.length}** embed(s) criada(s).`)
        .setFooter({ text: 'Lista atualizada', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.update({
        embeds: [listEmbed],
        components: [] // Remover componentes temporariamente
    });
}

async function confirmDelete(interaction, embedId, userId) {
    const result = embedManager.deleteEmbed(embedId, userId);

    if (!result.success) {
        return await interaction.update({
            content: `❌ ${result.error}`,
            embeds: [],
            components: []
        });
    }

    const successEmbed = new EmbedBuilder()
        .setColor(embedManager.getColor('success'))
        .setTitle('✅ Embed Deletada com Sucesso!')
        .setDescription(`A embed \`${embedId}\` foi deletada permanentemente.`)
        .setFooter({ text: 'Sistema de Embeds v2.0' })
        .setTimestamp();

    await interaction.update({
        embeds: [successEmbed],
        components: []
    });
}

async function handleEditAction(interaction, action, embedId, client) {
    const embed = embedManager.getEmbed(embedId);
    if (!embed || embed.authorId !== interaction.user.id) {
        return await interaction.update({
            content: '❌ Embed não encontrada ou sem permissão.',
            embeds: [],
            components: []
        });
    }

    switch (action) {
        case 'title':
            await showTitleModal(interaction, embedId);
            break;
        case 'description':
            await showDescriptionModal(interaction, embedId);
            break;
        case 'color':
            await showColorSelector(interaction, embedId);
            break;
        case 'thumbnail':
            await showThumbnailModal(interaction, embedId);
            break;
        case 'image':
            await showImageModal(interaction, embedId);
            break;
        case 'author':
            await showAuthorModal(interaction, embedId);
            break;
        case 'footer':
            await showFooterModal(interaction, embedId);
            break;
        case 'fields':
            await showFieldsManager(interaction, embedId, client);
            break;
    }
}

/**
 * Modais de edição
 */

async function showTitleModal(interaction, embedId) {
    const embed = embedManager.getEmbed(embedId);
    
    const modal = new ModalBuilder()
        .setCustomId(`embed_modal_title_${embedId}`)
        .setTitle('📝 Editar Título')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('title')
                    .setLabel('Título da Embed')
                    .setPlaceholder('Digite o título aqui...')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(256)
                    .setValue(embed?.data?.title || '')
            )
        );

    await interaction.showModal(modal);
}

async function showDescriptionModal(interaction, embedId) {
    const embed = embedManager.getEmbed(embedId);
    
    const modal = new ModalBuilder()
        .setCustomId(`embed_modal_description_${embedId}`)
        .setTitle('📄 Editar Descrição')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('description')
                    .setLabel('Descrição da Embed')
                    .setPlaceholder('Digite a descrição aqui...')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setMaxLength(4096)
                    .setValue(embed?.data?.description || '')
            )
        );

    await interaction.showModal(modal);
}

async function showThumbnailModal(interaction, embedId) {
    const embed = embedManager.getEmbed(embedId);
    
    const modal = new ModalBuilder()
        .setCustomId(`embed_modal_thumbnail_${embedId}`)
        .setTitle('🖼️ Editar Thumbnail')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('thumbnail')
                    .setLabel('URL do Thumbnail')
                    .setPlaceholder('https://exemplo.com/imagem.png')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setValue(embed?.data?.thumbnail || '')
            )
        );

    await interaction.showModal(modal);
}

async function showImageModal(interaction, embedId) {
    const embed = embedManager.getEmbed(embedId);
    
    const modal = new ModalBuilder()
        .setCustomId(`embed_modal_image_${embedId}`)
        .setTitle('📸 Editar Imagem')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('image')
                    .setLabel('URL da Imagem Principal')
                    .setPlaceholder('https://exemplo.com/imagem.png')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setValue(embed?.data?.image || '')
            )
        );

    await interaction.showModal(modal);
}

async function showAuthorModal(interaction, embedId) {
    const embed = embedManager.getEmbed(embedId);
    
    const modal = new ModalBuilder()
        .setCustomId(`embed_modal_author_${embedId}`)
        .setTitle('👤 Editar Autor')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('author_name')
                    .setLabel('Nome do Autor')
                    .setPlaceholder('Nome do autor')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(256)
                    .setValue(embed?.data?.author?.name || '')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('author_icon')
                    .setLabel('URL do Ícone do Autor')
                    .setPlaceholder('https://exemplo.com/icone.png')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setValue(embed?.data?.author?.iconURL || '')
            )
        );

    await interaction.showModal(modal);
}

async function showFooterModal(interaction, embedId) {
    const embed = embedManager.getEmbed(embedId);
    
    const modal = new ModalBuilder()
        .setCustomId(`embed_modal_footer_${embedId}`)
        .setTitle('📄 Editar Rodapé')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('footer_text')
                    .setLabel('Texto do Rodapé')
                    .setPlaceholder('Texto do rodapé')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(2048)
                    .setValue(embed?.data?.footer?.text || '')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('footer_icon')
                    .setLabel('URL do Ícone do Rodapé')
                    .setPlaceholder('https://exemplo.com/icone.png')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setValue(embed?.data?.footer?.iconURL || '')
            )
        );

    await interaction.showModal(modal);
}

async function showColorSelector(interaction, embedId) {
    const colors = embedManager.getColors();
    const colorNames = Object.keys(colors).filter(name => !name.includes('discord_'));
    
    const colorOptions = colorNames.map(colorName => 
        new StringSelectMenuOptionBuilder()
            .setLabel(`🎨 ${colorName.charAt(0).toUpperCase() + colorName.slice(1)}`)
            .setDescription(`Cor: ${colors[colorName]}`)
            .setValue(`${colorName}_${embedId}`)
    );

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('color_select')
        .setPlaceholder('🎨 Selecione uma cor...')
        .addOptions(colorOptions);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const infoEmbed = new EmbedBuilder()
        .setColor(embedManager.getColor('info'))
        .setTitle('🎨 Selecionar Cor')
        .setDescription('Escolha uma cor para sua embed:')
        .addFields(
            {
                name: '💡 Dica',
                value: 'Você pode ver uma prévia da cor ao lado do nome',
                inline: false
            }
        )
        .setFooter({ text: 'Sistema de Embeds v2.0' })
        .setTimestamp();

    await interaction.update({
        embeds: [infoEmbed],
        components: [row]
    });
}

async function showFieldsManager(interaction, embedId, client) {
    const embed = embedManager.getEmbed(embedId);
    const fields = embed?.data?.fields || [];

    const fieldsEmbed = new EmbedBuilder()
        .setColor(embedManager.getColor('info'))
        .setTitle('📋 Gerenciador de Campos')
        .setDescription(`Sua embed tem **${fields.length}** campo(s).`)
        .addFields(
            {
                name: '📋 Campos Atuais',
                value: fields.length > 0 
                    ? fields.map((field, index) => 
                        `**${index + 1}.** ${field.name}\n${field.value.substring(0, 50)}${field.value.length > 50 ? '...' : ''}`
                    ).join('\n\n')
                    : 'Nenhum campo adicionado.',
                inline: false
            }
        )
        .setFooter({ text: 'Use os botões para gerenciar campos' })
        .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`embed_add_field_${embedId}`)
            .setLabel('➕ Adicionar Campo')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`embed_remove_field_${embedId}`)
            .setLabel('➖ Remover Campo')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`embed_back_edit_${embedId}`)
            .setLabel('⬅️ Voltar')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
        embeds: [fieldsEmbed],
        components: [actionRow]
    });
}

/**
 * Atualizadores de dados
 */

async function updateEmbedTitle(interaction, embedId, userId) {
    const title = interaction.fields.getTextInputValue('title');
    const result = embedManager.updateEmbed(embedId, userId, { title });

    if (!result.success) {
        return await interaction.reply({
            content: `❌ ${result.error}`,
            ephemeral: true
        });
    }

    await interaction.reply({
        content: '✅ Título atualizado com sucesso!',
        ephemeral: true
    });

    // Atualizar painel
    setTimeout(() => {
        showEditPanel(interaction, embedId, interaction.client, false);
    }, 1000);
}

async function updateEmbedDescription(interaction, embedId, userId) {
    const description = interaction.fields.getTextInputValue('description');
    const result = embedManager.updateEmbed(embedId, userId, { description });

    if (!result.success) {
        return await interaction.reply({
            content: `❌ ${result.error}`,
            ephemeral: true
        });
    }

    await interaction.reply({
        content: '✅ Descrição atualizada com sucesso!',
        ephemeral: true
    });

    setTimeout(() => {
        showEditPanel(interaction, embedId, interaction.client, false);
    }, 1000);
}

async function updateEmbedThumbnail(interaction, embedId, userId) {
    const thumbnail = interaction.fields.getTextInputValue('thumbnail');
    const result = embedManager.updateEmbed(embedId, userId, { thumbnail });

    if (!result.success) {
        return await interaction.reply({
            content: `❌ ${result.error}`,
            ephemeral: true
        });
    }

    await interaction.reply({
        content: '✅ Thumbnail atualizado com sucesso!',
        ephemeral: true
    });

    setTimeout(() => {
        showEditPanel(interaction, embedId, interaction.client, false);
    }, 1000);
}

async function updateEmbedImage(interaction, embedId, userId) {
    const image = interaction.fields.getTextInputValue('image');
    const result = embedManager.updateEmbed(embedId, userId, { image });

    if (!result.success) {
        return await interaction.reply({
            content: `❌ ${result.error}`,
            ephemeral: true
        });
    }

    await interaction.reply({
        content: '✅ Imagem atualizada com sucesso!',
        ephemeral: true
    });

    setTimeout(() => {
        showEditPanel(interaction, embedId, interaction.client, false);
    }, 1000);
}

async function updateEmbedAuthor(interaction, embedId, userId) {
    const authorName = interaction.fields.getTextInputValue('author_name');
    const authorIcon = interaction.fields.getTextInputValue('author_icon');
    
    const author = {
        name: authorName || null,
        iconURL: authorIcon || null
    };

    const result = embedManager.updateEmbed(embedId, userId, { author });

    if (!result.success) {
        return await interaction.reply({
            content: `❌ ${result.error}`,
            ephemeral: true
        });
    }

    await interaction.reply({
        content: '✅ Autor atualizado com sucesso!',
        ephemeral: true
    });

    setTimeout(() => {
        showEditPanel(interaction, embedId, interaction.client, false);
    }, 1000);
}

async function updateEmbedFooter(interaction, embedId, userId) {
    const footerText = interaction.fields.getTextInputValue('footer_text');
    const footerIcon = interaction.fields.getTextInputValue('footer_icon');
    
    const footer = {
        text: footerText || null,
        iconURL: footerIcon || null
    };

    const result = embedManager.updateEmbed(embedId, userId, { footer });

    if (!result.success) {
        return await interaction.reply({
            content: `❌ ${result.error}`,
            ephemeral: true
        });
    }

    await interaction.reply({
        content: '✅ Rodapé atualizado com sucesso!',
        ephemeral: true
    });

    setTimeout(() => {
        showEditPanel(interaction, embedId, interaction.client, false);
    }, 1000);
}

async function updateEmbedColor(interaction, embedId, colorName, userId) {
    const color = embedManager.getColor(colorName);
    const result = embedManager.updateEmbed(embedId, userId, { color });

    if (!result.success) {
        return await interaction.update({
            content: `❌ ${result.error}`,
            embeds: [],
            components: []
        });
    }

    await interaction.update({
        content: '✅ Cor atualizada com sucesso!',
        embeds: [],
        components: []
    });

    setTimeout(() => {
        showEditPanel(interaction, embedId, interaction.client, false);
    }, 1000);
}

async function handleSave(interaction, embedId, userId) {
    const embed = embedManager.getEmbed(embedId);
    if (!embed || embed.authorId !== userId) {
        return await interaction.update({
            content: '❌ Embed não encontrada ou sem permissão.',
            embeds: [],
            components: []
        });
    }

    const successEmbed = new EmbedBuilder()
        .setColor(embedManager.getColor('success'))
        .setTitle('✅ Embed Salva com Sucesso!')
        .setDescription(`A embed \`${embedId}\` foi salva com todas as alterações.`)
        .addFields(
            {
                name: '🆔 ID',
                value: `\`${embedId}\``,
                inline: true
            },
            {
                name: '📝 Título',
                value: embed.data.title || 'Sem título',
                inline: true
            },
            {
                name: '📅 Última Atualização',
                value: new Date().toLocaleString('pt-BR'),
                inline: true
            }
        )
        .setFooter({ text: 'Sistema de Embeds v2.0' })
        .setTimestamp();

    await interaction.update({
        embeds: [successEmbed],
        components: []
    });
}

async function handleQuickSend(interaction, embedId, userId) {
    // Abrir modal para selecionar canal
    const modal = new ModalBuilder()
        .setCustomId(`embed_modal_send_${embedId}`)
        .setTitle('📤 Enviar Embed')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('channel_id')
                    .setLabel('ID do Canal (ou #canal)')
                    .setPlaceholder('ID numérico ou menção do canal')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            )
        );

    await interaction.showModal(modal);
}

async function handleQuickPreview(interaction, embedId, userId) {
    const embed = embedManager.getEmbed(embedId);
    if (!embed || embed.authorId !== userId) {
        return await interaction.update({
            content: '❌ Embed não encontrada ou sem permissão.',
            embeds: [],
            components: []
        });
    }

    const previewEmbed = embedManager.buildDiscordEmbed(embed.data);
    
    const infoEmbed = new EmbedBuilder()
        .setColor(embedManager.getColor('info'))
        .setTitle('👁️ Preview Completo')
        .setDescription(`Preview da embed \`${embedId}\``)
        .setFooter({ text: 'Sistema de Embeds v2.0 • Preview' })
        .setTimestamp();

    await interaction.update({
        embeds: [infoEmbed, previewEmbed],
        components: []
    });
}

async function handleCancel(interaction, embedId, userId) {
    const embed = embedManager.getEmbed(embedId);
    if (!embed || embed.authorId !== userId) {
        return await interaction.update({
            content: '❌ Embed não encontrada ou sem permissão.',
            embeds: [],
            components: []
        });
    }

    // Se for uma embed nova sem alterações, deletar
    if (embed.data.title === '' && embed.data.description === '') {
        embedManager.deleteEmbed(embedId, userId);
        
        const cancelEmbed = new EmbedBuilder()
            .setColor(embedManager.getColor('warning'))
            .setTitle('❌ Criação Cancelada')
            .setDescription('A embed foi descartada pois não foi alterada.')
            .setFooter({ text: 'Sistema de Embeds v2.0' })
            .setTimestamp();

        return await interaction.update({
            embeds: [cancelEmbed],
            components: []
        });
    }

    const cancelEmbed = new EmbedBuilder()
        .setColor(embedManager.getColor('warning'))
        .setTitle('✅ Edição Cancelada')
        .setDescription(`As alterações na embed \`${embedId}\` foram mantidas como estavam.`)
        .setFooter({ text: 'Sistema de Embeds v2.0' })
        .setTimestamp();

    await interaction.update({
        embeds: [cancelEmbed],
        components: []
    });
}

module.exports = {
    handleButtonInteraction,
    handleSelectMenuInteraction,
    handleModalSubmit
};

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ComponentType,
    PermissionFlagsBits
} = require('discord.js');

const embedManager = require('../../utils/embedManager');

/**
 * Sistema Profissional de Embeds v2.0
 * Inspirado nos melhores bots do Discord
 * 
 * @author Advanced Embed System
 * @description Sistema completo com interface moderna e intuitiva
 */

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('🎨 Sistema profissional de criação e gestão de embeds')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('✨ Crie uma nova embed com interface interativa')
                .addStringOption(option =>
                    option
                        .setName('template')
                        .setDescription('📋 Começar com um template (opcional)')
                        .setRequired(false)
                        .addChoices(
                            { name: '👋 Boas-vindas', value: 'welcome' },
                            { name: '📢 Anúncio', value: 'announcement' },
                            { name: '📜 Regras', value: 'rules' },
                            { name: '🎉 Evento', value: 'event' },
                            { name: '👋 Despedida', value: 'goodbye' },
                            { name: 'ℹ️ Informações', value: 'info' },
                            { name: '🤝 Parceria', value: 'partnership' },
                            { name: '🎁 Sorteio', value: 'giveaway' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('📋 Liste todas as suas embeds criadas')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('✏️ Edite uma embed existente com interface interativa')
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription('🆔 ID da embed que deseja editar')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('🗑️ Delete uma embed existente')
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription('🆔 ID da embed que deseja deletar')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('📤 Envie uma embed para um canal')
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription('🆔 ID da embed que deseja enviar')
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('📺 Canal onde a embed será enviada')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('preview')
                .setDescription('👁️ Visualize uma embed antes de enviar')
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription('🆔 ID da embed que deseja visualizar')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('📊 Veja suas estatísticas de embeds')
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            switch (subcommand) {
                case 'create':
                    await handleCreate(interaction, client);
                    break;
                case 'list':
                    await handleList(interaction, userId);
                    break;
                case 'edit':
                    await handleEdit(interaction, client, userId);
                    break;
                case 'delete':
                    await handleDelete(interaction, userId);
                    break;
                case 'send':
                    await handleSend(interaction, userId);
                    break;
                case 'preview':
                    await handlePreview(interaction, userId);
                    break;
                case 'stats':
                    await handleStats(interaction, userId);
                    break;
            }
        } catch (error) {
            console.error('❌ Erro no comando embed:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(embedManager.getColor('error'))
                .setTitle('❌ Erro Inesperado')
                .setDescription('Ocorreu um erro ao processar seu comando. Tente novamente.')
                .addFields({
                    name: '🐛 Detalhes do Erro',
                    value: `\`${error.message}\``,
                    inline: false
                })
                .setFooter({ 
                    text: 'Sistema de Embeds v2.0', 
                    iconURL: interaction.client.user.displayAvatarURL() 
                })
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

/**
 * Manipula a criação de nova embed
 */
async function handleCreate(interaction, client) {
    const template = interaction.options.getString('template');
    
    // Criar embed inicial
    let embedData = {
        title: '',
        description: '',
        color: embedManager.getColor('primary'),
        fields: [],
        thumbnail: null,
        image: null,
        author: null,
        footer: { text: 'Sistema de Embeds v2.0', iconURL: null }
    };

    // Aplicar template se selecionado
    if (template && embedManager.getTemplates()[template]) {
        embedData = { ...embedData, ...embedManager.getTemplates()[template].data };
    }

    // Criar embed no sistema
    const result = embedManager.createEmbed(interaction.user.id, embedData);
    
    if (!result.success) {
        const errorEmbed = new EmbedBuilder()
            .setColor(embedManager.getColor('error'))
            .setTitle('❌ Erro ao Criar Embed')
            .setDescription(result.error)
            .setFooter({ text: 'Sistema de Embeds v2.0' })
            .setTimestamp();

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    // Mostrar painel de edição
    await showEditPanel(interaction, result.embedId, client, true);
}

/**
 * Manipula a listagem de embeds
 */
async function handleList(interaction, userId) {
    const embeds = embedManager.listUserEmbeds(userId);
    const stats = embedManager.getStats(userId);

    if (embeds.length === 0) {
        const emptyEmbed = new EmbedBuilder()
            .setColor(embedManager.getColor('info'))
            .setTitle('📝 Nenhuma Embed Encontrada')
            .setDescription('Você ainda não criou nenhuma embed. Vamos criar sua primeira?')
            .addFields(
                {
                    name: '🎨 Como Criar',
                    value: '`/embed create` - Comece com um template ou do zero',
                    inline: false
                },
                {
                    name: '📊 Seu Limite',
                    value: `${stats.used || 0}/${stats.maxAllowed} embeds criadas`,
                    inline: true
                },
                {
                    name: '🆔 IDs Únicos',
                    value: 'Cada embed tem um ID único de 6 caracteres',
                    inline: true
                }
            )
            .setFooter({ 
                text: 'Sistema de Embeds v2.0 • Use /embed create para começar',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        // Adicionar botão de criação rápida
        const createAction = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('embed_quick_create')
                .setLabel('✨ Criar Primeira Embed')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎨')
        );

        return await interaction.reply({ 
            embeds: [emptyEmbed], 
            components: [createAction],
            ephemeral: true 
        });
    }

    // Criar embed de listagem
    const listEmbed = new EmbedBuilder()
        .setColor(embedManager.getColor('primary'))
        .setTitle('📝 Suas Embeds')
        .setDescription(`Você tem **${embeds.length}** embed(s) criada(s).`)
        .addFields(
            {
                name: '📊 Estatísticas',
                value: `**Criadas:** ${stats.used || 0}\n**Disponíveis:** ${stats.remaining}\n**Recentes:** ${stats.recent || 0}`,
                inline: true
            },
            {
                name: '🎯 Ações Rápidas',
                value: 'Clique nos botões abaixo para gerenciar suas embeds',
                inline: true
            }
        )
        .setFooter({ 
            text: 'Sistema de Embeds v2.0 • Selecione uma embed para gerenciar',
            iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

    // Criar seletor de embeds
    const selectOptions = embeds.slice(0, 25).map((embed, index) => {
        const title = embed.data.title || 'Sem Título';
        const preview = embed.data.description?.substring(0, 50) || 'Sem Descrição';
        const date = new Date(embed.createdAt).toLocaleDateString('pt-BR');
        
        return new StringSelectMenuOptionBuilder()
            .setLabel(`${index + 1}. ${title.substring(0, 30)}${title.length > 30 ? '...' : ''}`)
            .setDescription(`${preview}${embed.data.description?.length > 50 ? '...' : ''} • ${date}`)
            .setValue(embed.id);
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('embed_select')
        .setPlaceholder('🔍 Selecione uma embed para gerenciar...')
        .addOptions(selectOptions);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    // Botões de ação rápida
    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('embed_create_new')
            .setLabel('✨ Criar Nova')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎨'),
        new ButtonBuilder()
            .setCustomId('embed_refresh_list')
            .setLabel('🔄 Atualizar')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔄')
    );

    await interaction.reply({ 
        embeds: [listEmbed], 
        components: [selectRow, actionRow],
        ephemeral: true 
    });
}

/**
 * Manipula a edição de embed
 */
async function handleEdit(interaction, client, userId) {
    const embedId = interaction.options.getString('id').toUpperCase();
    const embed = embedManager.getEmbed(embedId);

    if (!embed) {
        const errorEmbed = new EmbedBuilder()
            .setColor(embedManager.getColor('error'))
            .setTitle('❌ Embed Não Encontrada')
            .setDescription(`A embed com ID \`${embedId}\` não existe ou não pertence a você.`)
            .addFields(
                {
                    name: '💡 Dica',
                    value: 'Use `/embed list` para ver todas as suas embeds e seus IDs',
                    inline: false
                }
            )
            .setFooter({ text: 'Sistema de Embeds v2.0' })
            .setTimestamp();

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    if (embed.authorId !== userId) {
        const errorEmbed = new EmbedBuilder()
            .setColor(embedManager.getColor('error'))
            .setTitle('❌ Sem Permissão')
            .setDescription('Você só pode editar suas próprias embeds.')
            .setFooter({ text: 'Sistema de Embeds v2.0' })
            .setTimestamp();

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    await showEditPanel(interaction, embedId, client, false);
}

/**
 * Manipula a deleção de embed
 */
async function handleDelete(interaction, userId) {
    const embedId = interaction.options.getString('id').toUpperCase();
    const embed = embedManager.getEmbed(embedId);

    if (!embed) {
        const errorEmbed = new EmbedBuilder()
            .setColor(embedManager.getColor('error'))
            .setTitle('❌ Embed Não Encontrada')
            .setDescription(`A embed com ID \`${embedId}\` não existe.`)
            .setFooter({ text: 'Sistema de Embeds v2.0' })
            .setTimestamp();

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    if (embed.authorId !== userId) {
        const errorEmbed = new EmbedBuilder()
            .setColor(embedManager.getColor('error'))
            .setTitle('❌ Sem Permissão')
            .setDescription('Você só pode deletar suas próprias embeds.')
            .setFooter({ text: 'Sistema de Embeds v2.0' })
            .setTimestamp();

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    // Criar embed de confirmação
    const confirmEmbed = new EmbedBuilder()
        .setColor(embedManager.getColor('warning'))
        .setTitle('⚠️ Confirmar Deleção')
        .setDescription(`Tem certeza que deseja deletar esta embed?`)
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
                name: '📅 Criada em',
                value: new Date(embed.createdAt).toLocaleDateString('pt-BR'),
                inline: true
            }
        )
        .setFooter({ 
            text: 'Esta ação não pode ser desfeita',
            iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

    // Criar botões de confirmação
    const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`embed_confirm_delete_${embedId}`)
            .setLabel('✅ Sim, Deletar')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️'),
        new ButtonBuilder()
            .setCustomId('embed_cancel_delete')
            .setLabel('❌ Cancelar')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❌')
    );

    await interaction.reply({ 
        embeds: [confirmEmbed], 
        components: [confirmRow],
        ephemeral: true 
    });
}

/**
 * Manipula o envio de embed
 */
async function handleSend(interaction, userId) {
    const embedId = interaction.options.getString('id').toUpperCase();
    const channel = interaction.options.getChannel('channel');
    const embed = embedManager.getEmbed(embedId);

    if (!embed) {
        const errorEmbed = new EmbedBuilder()
            .setColor(embedManager.getColor('error'))
            .setTitle('❌ Embed Não Encontrada')
            .setDescription(`A embed com ID \`${embedId}\` não existe.`)
            .setFooter({ text: 'Sistema de Embeds v2.0' })
            .setTimestamp();

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    if (embed.authorId !== userId) {
        const errorEmbed = new EmbedBuilder()
            .setColor(embedManager.getColor('error'))
            .setTitle('❌ Sem Permissão')
            .setDescription('Você só pode enviar suas próprias embeds.')
            .setFooter({ text: 'Sistema de Embeds v2.0' })
            .setTimestamp();

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    // Verificar permissões
    const permissions = channel.permissionsFor(interaction.guild.members.me);
    if (!permissions.has('SendMessages') || !permissions.has('EmbedLinks')) {
        const errorEmbed = new EmbedBuilder()
            .setColor(embedManager.getColor('error'))
            .setTitle('❌ Sem Permissão')
            .setDescription('Não tenho permissão para enviar embeds neste canal.')
            .addFields(
                {
                    name: '🔑 Permissões Necessárias',
                    value: '• Enviar Mensagens\n• Inserir Links',
                    inline: false
                }
            )
            .setFooter({ text: 'Sistema de Embeds v2.0' })
            .setTimestamp();

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    try {
        // Construir e enviar embed
        const discordEmbed = embedManager.buildDiscordEmbed(embed.data);
        await channel.send({ embeds: [discordEmbed] });

        // Embed de sucesso
        const successEmbed = new EmbedBuilder()
            .setColor(embedManager.getColor('success'))
            .setTitle('✅ Embed Enviada com Sucesso!')
            .setDescription(`Sua embed foi enviada para ${channel}`)
            .addFields(
                {
                    name: '🆔 ID da Embed',
                    value: `\`${embedId}\``,
                    inline: true
                },
                {
                    name: '📺 Canal',
                    value: `${channel}`,
                    inline: true
                },
                {
                    name: '👤 Enviada por',
                    value: interaction.user.tag,
                    inline: true
                }
            )
            .setFooter({ 
                text: 'Sistema de Embeds v2.0',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

    } catch (error) {
        console.error('❌ Erro ao enviar embed:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(embedManager.getColor('error'))
            .setTitle('❌ Erro ao Enviar')
            .setDescription('Ocorreu um erro ao enviar sua embed.')
            .addFields(
                {
                    name: '🐛 Detalhes',
                    value: `\`${error.message}\``,
                    inline: false
                }
            )
            .setFooter({ text: 'Sistema de Embeds v2.0' })
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

/**
 * Manipula o preview de embed
 */
async function handlePreview(interaction, userId) {
    const embedId = interaction.options.getString('id').toUpperCase();
    const embed = embedManager.getEmbed(embedId);

    if (!embed) {
        const errorEmbed = new EmbedBuilder()
            .setColor(embedManager.getColor('error'))
            .setTitle('❌ Embed Não Encontrada')
            .setDescription(`A embed com ID \`${embedId}\` não existe.`)
            .setFooter({ text: 'Sistema de Embeds v2.0' })
            .setTimestamp();

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    if (embed.authorId !== userId) {
        const errorEmbed = new EmbedBuilder()
            .setColor(embedManager.getColor('error'))
            .setTitle('❌ Sem Permissão')
            .setDescription('Você só pode visualizar suas próprias embeds.')
            .setFooter({ text: 'Sistema de Embeds v2.0' })
            .setTimestamp();

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    // Construir embed de preview
    const previewEmbed = embedManager.buildDiscordEmbed(embed.data);

    // Embed de informações
    const infoEmbed = new EmbedBuilder()
        .setColor(embedManager.getColor('info'))
        .setTitle('👁️ Preview da Embed')
        .setDescription(`Visualização da embed \`${embedId}\``)
        .addFields(
            {
                name: '🆔 ID',
                value: `\`${embedId}\``,
                inline: true
            },
            {
                name: '📅 Criada',
                value: new Date(embed.createdAt).toLocaleDateString('pt-BR'),
                inline: true
            },
            {
                name: '🔄 Atualizada',
                value: new Date(embed.updatedAt).toLocaleDateString('pt-BR'),
                inline: true
            },
            {
                name: '📊 Estatísticas',
                value: `**Campos:** ${embed.data.fields?.length || 0}\n**Thumbnail:** ${embed.data.thumbnail ? '✅' : '❌'}\n**Imagem:** ${embed.data.image ? '✅' : '❌'}\n**Autor:** ${embed.data.author ? '✅' : '❌'}`,
                inline: false
            }
        )
        .setFooter({ 
            text: 'Sistema de Embeds v2.0 • Preview',
            iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

    await interaction.reply({ 
        embeds: [infoEmbed, previewEmbed], 
        ephemeral: true 
    });
}

/**
 * Manipula as estatísticas
 */
async function handleStats(interaction, userId) {
    const stats = embedManager.getStats(userId);
    const embeds = embedManager.listUserEmbeds(userId);

    const statsEmbed = new EmbedBuilder()
        .setColor(embedManager.getColor('primary'))
        .setTitle('📊 Suas Estatísticas de Embeds')
        .setDescription('Acompanhe seu uso do sistema de embeds')
        .addFields(
            {
                name: '📝 Embeds Criadas',
                value: `**${stats.total}** de ${stats.maxAllowed} permitidas`,
                inline: true
            },
            {
                name: '🎯 Embeds Restantes',
                value: `**${stats.remaining}** disponíveis`,
                inline: true
            },
            {
                name: '🕐 Embeds Recentes',
                value: `**${stats.recent}** na última semana`,
                inline: true
            }
        )
        .setFooter({ 
            text: 'Sistema de Embeds v2.0',
            iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

    // Adicionar informações das embeds mais recentes se houver
    if (embeds.length > 0) {
        const recentEmbeds = embeds.slice(0, 3);
        const recentText = recentEmbeds.map((embed, index) => {
            const title = embed.data.title || 'Sem título';
            const date = new Date(embed.createdAt).toLocaleDateString('pt-BR');
            return `${index + 1}. **${title.substring(0, 25)}${title.length > 25 ? '...' : ''}** (\`${embed.id}\`) - ${date}`;
        }).join('\n');

        statsEmbed.addFields({
            name: '🕐 Embeds Mais Recentes',
            value: recentText,
            inline: false
        });
    }

    await interaction.reply({ embeds: [statsEmbed], ephemeral: true });
}

/**
 * Mostra o painel de edição interativo
 */
async function showEditPanel(interaction, embedId, client, isNew = false) {
    const embed = embedManager.getEmbed(embedId);
    if (!embed) return;

    const previewEmbed = embedManager.buildDiscordEmbed(embed.data);
    
    // Embed de informações do painel
    const panelEmbed = new EmbedBuilder()
        .setColor(embedManager.getColor('primary'))
        .setTitle(`${isNew ? '✨' : '✏️'} ${isNew ? 'Criando' : 'Editando'} Embed`)
        .setDescription(`ID: \`${embedId}\` • Use os botões abaixo para editar`)
        .addFields(
            {
                name: '🎨 Componentes',
                value: 'Clique nos botões para editar cada parte da embed',
                inline: false
            },
            {
                name: '💡 Dica',
                value: 'Você pode editar título, descrição, cor, campos, imagens e muito mais!',
                inline: false
            }
        )
        .setFooter({ 
            text: 'Sistema de Embeds v2.0 • Interface Interativa',
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();

    // Linha 1: Edição básica
    const basicRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`embed_edit_title_${embedId}`)
            .setLabel('📝 Título')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`embed_edit_description_${embedId}`)
            .setLabel('📄 Descrição')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`embed_edit_color_${embedId}`)
            .setLabel('🎨 Cor')
            .setStyle(ButtonStyle.Secondary)
    );

    // Linha 2: Mídia
    const mediaRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`embed_edit_thumbnail_${embedId}`)
            .setLabel('🖼️ Thumbnail')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`embed_edit_image_${embedId}`)
            .setLabel('📸 Imagem')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`embed_edit_author_${embedId}`)
            .setLabel('👤 Autor')
            .setStyle(ButtonStyle.Secondary)
    );

    // Linha 3: Campos e avançado
    const advancedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`embed_edit_fields_${embedId}`)
            .setLabel('📋 Campos')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`embed_edit_footer_${embedId}`)
            .setLabel('📄 Rodapé')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`embed_preview_${embedId}`)
            .setLabel('👁️ Preview')
            .setStyle(ButtonStyle.Primary)
    );

    // Linha 4: Ações finais
    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`embed_save_${embedId}`)
            .setLabel('💾 Salvar')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`embed_send_${embedId}`)
            .setLabel('📤 Enviar')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`embed_cancel_${embedId}`)
            .setLabel('❌ Cancelar')
            .setStyle(ButtonStyle.Danger)
    );

    if (isNew) {
        // Para novas embeds, não mostrar botão de cancelar inicialmente
        actionRow.components.pop();
    }

    if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ 
            embeds: [panelEmbed, previewEmbed], 
            components: [basicRow, mediaRow, advancedRow, actionRow] 
        });
    } else {
        await interaction.reply({ 
            embeds: [panelEmbed, previewEmbed], 
            components: [basicRow, mediaRow, advancedRow, actionRow],
            ephemeral: true 
        });
    }
}

module.exports.showEditPanel = showEditPanel;

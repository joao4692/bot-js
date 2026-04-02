const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const pollManager = require('../../utils/pollManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enquete')
        .setDescription('📊 Sistema completo de enquetes para o servidor')
        .addSubcommand(subcommand =>
            subcommand
                .setName('criar')
                .setDescription('✨ Criar nova enquete de forma simples e rápida')
                .addStringOption(option =>
                    option
                        .setName('titulo')
                        .setDescription('📊 TÍTULO da enquete - Ex: "Qual melhor horário para evento?"')
                        .setRequired(true)
                        .setMaxLength(256)
                )
                .addStringOption(option =>
                    option
                        .setName('opcoes')
                        .setDescription('📋 OPÇÕES separadas por | - Ex: "20h|21h|22h" (mín:2, máx:10)')
                        .setRequired(true)
                        .setMaxLength(500)
                )
                .addStringOption(option =>
                    option
                        .setName('descricao')
                        .setDescription('📝 DESCRIÇÃO opcional - Ex: "Evento semanal para todos"')
                        .setRequired(false)
                        .setMaxLength(1000)
                )
                .addIntegerOption(option =>
                    option
                        .setName('duracao')
                        .setDescription('⏰ DURAÇÃO em minutos - Ex: 60 (1h), 1440 (1d), 10080 (7d)')
                        .setMinValue(1)
                        .setMaxValue(10080)
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName('anonima')
                        .setDescription('🔐 ENQUETE ANÔNIMA? - true=sim, false=não (padrão: false)')
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName('multiplos')
                        .setDescription('🔄 MÚLTIPLOS VOTOS? - true=sim, false=não (padrão: false)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('encerrar')
                .setDescription('🔴 ENCERRAR enquete ativa - Finaliza votação e mostra resultados')
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription('🆔 ID da MENSAGEM - Clique com botão direito > Copiar ID')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('resultados')
                .setDescription('📊 VER RESULTADOS - Mostra estatísticas detalhadas da enquete')
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription('🆔 ID da MENSAGEM - Clique com botão direito > Copiar ID')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('listar')
                .setDescription('📋 LISTAR enquetes - Mostra todas as enquetes ativas do servidor')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('visual')
                .setDescription('🎨 CRIAR com janela - Interface visual mais fácil de usar')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'criar':
                await handleCreate(interaction, client);
                break;
            case 'encerrar':
                await handleEnd(interaction, client);
                break;
            case 'resultados':
                await handleResults(interaction, client);
                break;
            case 'listar':
                await handleList(interaction, client);
                break;
            case 'visual':
                await handleVisual(interaction, client);
                break;
        }
    }
};

async function handleCreate(interaction, client) {
    const title = interaction.options.getString('titulo');
    const description = interaction.options.getString('descricao');
    const optionsText = interaction.options.getString('opcoes');
    const duration = interaction.options.getInteger('duracao');
    const anonymous = interaction.options.getBoolean('anonima') ?? false;
    const multipleVotes = interaction.options.getBoolean('multiplos') ?? false;

    // Validações simples e diretas
    if (!title || title.trim().length === 0) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ ERRO: Título obrigatório!')
                    .setDescription('Você precisa fornecer um título para a enquete.')
                    .addFields(
                        { name: '📝 Exemplo correto:', value: '`/enquete criar titulo:"Qual melhor horário?" opcoes:"Manhã|Tarde|Noite"`', inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    if (title.length > 256) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ ERRO: Título muito longo!')
                    .setDescription(`Seu título tem ${title.length} caracteres. Máximo permitido: 256`)
                    .addFields(
                        { name: '💡 Solução:', value: 'Use um título mais curto e direto', inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    if (!optionsText || optionsText.trim().length === 0) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ ERRO: Opções obrigatórias!')
                    .setDescription('Você precisa fornecer as opções da enquete.')
                    .addFields(
                        { name: '📋 Formato correto:', value: 'Separe as opções com `|` (pipe)', inline: false },
                        { name: '📝 Exemplo:', value: '`opcoes:"Sim|Não|Talvez|Precisa melhorar"`', inline: false },
                        { name: '🔢 Regras:', value: '• Mínimo: 2 opções\n• Máximo: 10 opções', inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    const options = optionsText.split('|').map(opt => opt.trim()).filter(opt => opt.length > 0);

    if (options.length < 2) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ ERRO: Poucas opções!')
                    .setDescription(`Você forneceu apenas ${options.length} opção(ões). Mínimo necessário: 2`)
                    .addFields(
                        { name: '📋 Suas opções:', value: options.length > 0 ? options.map(opt => `• ${opt}`).join('\n') : 'Nenhuma', inline: false },
                        { name: '📝 Exemplo correto:', value: '`opcoes:"Opção 1|Opção 2|Opção 3"`', inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    if (options.length > 10) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ ERRO: Muitas opções!')
                    .setDescription(`Você forneceu ${options.length} opções. Máximo permitido: 10`)
                    .addFields(
                        { name: '📋 Suas opções:', value: options.map((opt, i) => `${i + 1}. ${opt}`).join('\n'), inline: false },
                        { name: '💡 Solução:', value: 'Agrupe opções similares ou crie enquetes separadas', inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    // Verificar opções duplicadas
    const duplicateOptions = options.filter((option, index) => options.indexOf(option) !== index);
    if (duplicateOptions.length > 0) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⚠️ AVISO: Opções duplicadas!')
                    .setDescription('Você tem opções repetidas na sua enquete.')
                    .addFields(
                        { name: '🔄 Opções duplicadas:', value: duplicateOptions.map(opt => `• ${opt}`).join('\n'), inline: false },
                        { name: '💡 Como corrigir:', value: 'Remova as opções duplicadas', inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    // Validação da duração
    if (duration && duration < 1) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ ERRO: Duração inválida!')
                    .setDescription('A duração mínima é de 1 minuto.')
                    .addFields(
                        { name: '📝 Exemplos válidos:', value: '• `duracao:60` (1 hora)\n• `duracao:1440` (1 dia)\n• `duracao:10080` (7 dias)', inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    if (duration && duration > 10080) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ ERRO: Duração muito longa!')
                    .setDescription(`Você informou ${duration} minutos. Máximo permitido: 10080 (7 dias)`)
                    .addFields(
                        { name: '💡 Sugestão:', value: 'Use um período menor ou crie várias enquetes', inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    await interaction.deferReply();

    try {
        // Criar enquete diretamente sem preview (mais rápido)
        const pollEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📊 ${title}`)
            .setAuthor({
                name: `Enquete criada por ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        if (description) {
            pollEmbed.setDescription(description);
        }

        const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        const optionsFields = options.map((option, index) => {
            const emoji = optionEmojis[index] || '📌';
            return `${emoji} **${option}** - 0 votos (0.0%)`;
        });

        pollEmbed.addFields(
            { name: '📋 Opções:', value: optionsFields.join('\n'), inline: false }
        );

        pollEmbed.addFields(
            { name: '⚙️ Configurações:', value: 
                `🔐 **Anônima:** ${anonymous ? 'Sim' : 'Não'}\n` +
                `🔄 **Múltiplos votos:** ${multipleVotes ? 'Sim' : 'Não'}\n` +
                `⏰ **Duração:** ${duration ? `${duration} minutos` : 'Ilimitada'}`,
                inline: false }
        );

        pollEmbed.addFields(
            { name: '📈 Status:', value: '🟢 **Ativa**', inline: false }
        );

        pollEmbed.setFooter({ 
            text: `ID: ${interaction.id} • Clique nos botões para votar`,
            iconURL: client.user.displayAvatarURL()
        });

        pollEmbed.setTimestamp();

        const buttons = [];
        for (let i = 0; i < options.length; i++) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`poll_vote_${i}`)
                    .setLabel(`${i + 1}`)
                    .setEmoji(optionEmojis[i] || '📌')
                    .setStyle(ButtonStyle.Primary)
            );
        }

        if (multipleVotes) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('poll_clear_votes')
                    .setLabel('🗑️ Limpar')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        const rows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
        }

        const message = await interaction.channel.send({
            embeds: [pollEmbed],
            components: rows
        });

        const pollData = {
            title,
            description,
            options,
            messageId: message.id,
            channelId: message.channel.id,
            guildId: interaction.guild.id,
            authorId: interaction.user.id,
            duration: duration ? duration * 60 * 1000 : null,
            anonymous,
            multipleVotes
        };

        const poll = pollManager.createPoll(pollData);

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Enquete Criada com Sucesso!')
                    .setDescription(`Sua enquete foi criada com ID: \`${poll.id}\``)
                    .addFields(
                        { name: '📊 Título:', value: title, inline: true },
                        { name: '📋 Opções:', value: `${options.length} opções`, inline: true },
                        { name: '🔗 Mensagem:', value: `[Ir para enquete](${message.url})`, inline: false }
                    )
                    .setTimestamp()
            ]
        });

    } catch (error) {
        console.error('Erro ao criar enquete:', error);
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erro ao Criar Enquete')
                    .setDescription('Ocorreu um erro ao criar a enquete. Tente novamente.')
                    .setTimestamp()
            ]
        });
    }
}

async function handleEnd(interaction, client) {
    const messageId = interaction.options.getString('id');

    if (!messageId) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ ID da Mensagem Necessário')
                    .setDescription('Você precisa fornecer o ID da mensagem da enquete que deseja encerrar.')
                    .addFields(
                        { name: 'Como obter o ID?', value: 'Clique com o botão direito na mensagem da enquete e selecione "Copiar ID"', inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    const poll = pollManager.getPollByMessage(messageId);

    if (!poll) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Enquete Não Encontrada')
                    .setDescription('Não foi encontrada uma enquete com este ID de mensagem.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    if (!poll.active) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⚠️ Enquete Já Encerrada')
                    .setDescription('Esta enquete já foi encerrada anteriormente.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    const result = pollManager.endPoll(poll.id);

    if (result.success) {
        const endedPoll = result.poll;
        const results = pollManager.getResults(poll.id);

        const channel = await client.channels.fetch(endedPoll.channelId).catch(() => null);
        if (channel) {
            try {
                const message = await channel.messages.fetch(endedPoll.messageId).catch(() => null);
                if (message) {
                    const updatedEmbed = EmbedBuilder.from(message.embeds[0])
                        .setColor('#ff6600')
                        .spliceFields(3, 1, { name: '📈 Status:', value: '🔴 **Encerrada**', inline: false });

                    if (results) {
                        const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
                        const optionsFields = results.results.map((result, index) => {
                            const emoji = optionEmojis[index] || '📌';
                            return `${emoji} **${result.option}** - ${result.votes} votos (${result.percentage.toFixed(1)}%)`;
                        });

                        updatedEmbed.spliceFields(0, 1, { name: '📋 Opções:', value: optionsFields.join('\n'), inline: false });
                        updatedEmbed.addFields(
                            { name: '🏆 Resultado Final:', value: `Total de votos: ${results.totalVotes}`, inline: false }
                        );
                    }

                    updatedEmbed.setFooter({ 
                        text: `Enquete encerrada • ID: ${interaction.id}`,
                        iconURL: client.user.displayAvatarURL()
                    });

                    await message.edit({
                        embeds: [updatedEmbed],
                        components: []
                    });
                }
            } catch (error) {
                console.error('Erro ao atualizar mensagem da enquete:', error);
            }
        }

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Enquete Encerrada com Sucesso!')
                    .setDescription(`A enquete "${endedPoll.title}" foi encerrada.`)
                    .addFields(
                        { name: '📊 Total de Votos:', value: `${results.totalVotes} votos`, inline: true },
                        { name: '🏆 Vencedor:', value: results.results.length > 0 ? 
                            results.results.reduce((a, b) => a.votes > b.votes ? a : b).option : 
                            'Nenhum voto', inline: true }
                    )
                    .setTimestamp()
            ]
        });
    } else {
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erro ao Encerrar Enquete')
                    .setDescription(result.error)
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }
}

async function handleResults(interaction, client) {
    const messageId = interaction.options.getString('id');

    if (!messageId) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ ID da Mensagem Necessário')
                    .setDescription('Você precisa fornecer o ID da mensagem da enquete.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    const poll = pollManager.getPollByMessage(messageId);

    if (!poll) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Enquete Não Encontrada')
                    .setDescription('Não foi encontrada uma enquete com este ID de mensagem.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    const results = pollManager.getResults(poll.id);

    const resultsEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`📊 Resultados da Enquete: ${poll.title}`)
        .setAuthor({
            name: `Enquete criada por ${client.users.cache.get(poll.authorId)?.username || 'Desconhecido'}`,
            iconURL: client.users.cache.get(poll.authorId)?.displayAvatarURL()
        });

    if (poll.description) {
        resultsEmbed.setDescription(poll.description);
    }

    const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    const optionsFields = results.results.map((result, index) => {
        const emoji = optionEmojis[index] || '📌';
        const bar = '█'.repeat(Math.round(result.percentage / 10));
        const emptyBar = '░'.repeat(10 - Math.round(result.percentage / 10));
        return `${emoji} **${result.option}**\n\`${bar}${emptyBar}\` ${result.votos} votos (${result.percentage.toFixed(1)}%)`;
    });

    resultsEmbed.addFields(
        { name: '📋 Resultados:', value: optionsFields.join('\n\n'), inline: false }
    );

    resultsEmbed.addFields(
        { name: '📊 Estatísticas:', 
            value: `🗳️ **Total de votos:** ${results.totalVotes}\n` +
                   `👥 **Participantes:** ${Object.keys(results.votes || {}).length}\n` +
                   `📈 **Status:** ${results.active ? '🟢 Ativa' : '🔴 Encerrada'}`,
            inline: false }
    );

    if (results.totalVotes > 0) {
        const winner = results.results.reduce((a, b) => a.votes > b.votes ? a : b);
        resultsEmbed.addFields(
            { name: '🏆 Lider Atual:', value: `**${winner.option}** com ${winner.votos} votos (${winner.percentage.toFixed(1)}%)`, inline: false }
        );
    }

    resultsEmbed.setFooter({ 
        text: `ID: ${poll.id} • Criada em: ${new Date(poll.createdAt).toLocaleString('pt-BR')}`,
        iconURL: client.user.displayAvatarURL()
    });

    resultsEmbed.setTimestamp();

    await interaction.reply({
        embeds: [resultsEmbed],
        ephemeral: true
    });
}

async function handleList(interaction, client) {
    const activePolls = pollManager.getActivePolls(interaction.guild.id);

    if (activePolls.length === 0) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('📋 Nenhuma Enquete Ativa')
                    .setDescription('Não há enquetes ativas neste servidor no momento.')
                    .addFields(
                        { name: '💡 Dica:', value: 'Use `/enquete criar` para criar uma nova enquete!', inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    const listEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📊 Enquetes Ativas')
        .setDescription(`Atualmente há **${activePolls.length}** enquete(s) ativa(s) no servidor.`);

    const pollList = await Promise.all(activePolls.map(async (poll, index) => {
        const channel = await client.channels.fetch(poll.channelId).catch(() => null);
        const channelName = channel ? `#${channel.name}` : 'Canal desconhecido';
        const results = pollManager.getResults(poll.id);
        const timeLeft = poll.endsAt ? 
            Math.max(0, Math.floor((new Date(poll.endsAt) - new Date()) / 60000)) : 
            null;

        return `**${index + 1}. ${poll.title}**\n` +
               `📝 Canal: ${channelName}\n` +
               `🗳️ Votos: ${results.totalVotes}\n` +
               `⏰ ${timeLeft ? `Restam: ${timeLeft} minutos` : 'Sem limite de tempo'}\n` +
               `🔗 [Ir para enquete](https://discord.com/channels/${poll.guildId}/${poll.channelId}/${poll.messageId})`;
    }));

    listEmbed.addFields(
        { name: '📋 Lista de Enquetes:', value: pollList.join('\n\n'), inline: false }
    );

    listEmbed.setFooter({ 
        text: `Servidor: ${interaction.guild.name}`,
        iconURL: interaction.guild.iconURL()
    });

    listEmbed.setTimestamp();

    await interaction.reply({
        embeds: [listEmbed],
        ephemeral: true
    });
}

// Função para criar enquete visual com modal
async function handleVisual(interaction, client) {
    // Verificar se showModal está disponível
    if (!interaction.showModal || typeof interaction.showModal !== 'function') {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⚠️ Interface Visual Indisponível')
                    .setDescription('Use o comando `/enquete criar` que também está melhorado!')
                    .addFields(
                        { name: '📝 Comando alternativo:', value: '`/enquete criar titulo:"Sua pergunta" opcoes:"Opção 1|Opção 2"`', inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    // Criar modal para criação de enquete
    const modal = new ModalBuilder()
        .setCustomId('create_poll_modal')
        .setTitle('📊 Criar Nova Enquete')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('poll_title')
                    .setLabel('📊 Título da Enquete')
                    .setPlaceholder('Ex: Qual melhor horário para evento?')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(256)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('poll_description')
                    .setLabel('📝 Descrição (opcional)')
                    .setPlaceholder('Ex: Estamos planejando um evento semanal...')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setMaxLength(1000)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('poll_options')
                    .setLabel('📋 Opções (separe com |)')
                    .setPlaceholder('Ex: Segunda 20h | Quarta 20h | Sexta 20h | Sábado 15h')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(500)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('poll_duration')
                    .setLabel('⏰ Duração em minutos (opcional)')
                    .setPlaceholder('Ex: 60 (1 hora) ou 1440 (1 dia) - deixe em branco para ilimitado')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(5)
            )
        );

    try {
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Erro ao mostrar modal:', error);
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erro ao Abrir Interface')
                    .setDescription('Não foi possível abrir a janela de criação. Use `/enquete criar` como alternativa.')
                    .addFields(
                        { name: '📝 Comando alternativo:', value: '`/enquete criar titulo:"Sua pergunta" opcoes:"Opção 1|Opção 2"`', inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }
}

// Exportar funções para uso em outros módulos
module.exports.handleCreatePollModal = handleCreatePollModal;
module.exports.handlePollConfigModal = handlePollConfigModal;

// Handler para o modal de criação
async function handleCreatePollModal(interaction, client) {
    const title = interaction.fields.getTextInputValue('poll_title').trim();
    const description = interaction.fields.getTextInputValue('poll_description').trim();
    const optionsText = interaction.fields.getTextInputValue('poll_options').trim();
    const durationText = interaction.fields.getTextInputValue('poll_duration').trim();

    // Validações
    if (!title) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Título Obrigatório')
                    .setDescription('O título da enquete não pode estar vazio!')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    if (!optionsText) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Opções Obrigatórias')
                    .setDescription('Você precisa fornecer as opções da enquete!')
                    .addFields(
                        { name: '📋 Formato:', value: 'Separe as opções com `|`', inline: false },
                        { name: '📝 Exemplo:', value: 'Opção 1 | Opção 2 | Opção 3', inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    const options = optionsText.split('|').map(opt => opt.trim()).filter(opt => opt.length > 0);

    if (options.length < 2) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Opções Insuficientes')
                    .setDescription(`Você forneceu apenas ${options.length} opção(ões). São necessárias pelo menos 2!`)
                    .addFields(
                        { name: '📋 Opções encontradas:', value: options.length > 0 ? options.map(opt => `• ${opt}`).join('\n') : 'Nenhuma', inline: false },
                        { name: '📝 Exemplo:', value: 'Sim | Não | Talvez', inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    if (options.length > 10) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Opções Excessivas')
                    .setDescription(`Você forneceu ${options.length} opções. O máximo permitido é 10!`)
                    .addFields(
                        { name: '💡 Sugestão:', value: 'Agrupe opções similares ou crie enquetes separadas', inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    // Verificar opções duplicadas
    const duplicateOptions = options.filter((option, index) => options.indexOf(option) !== index);
    if (duplicateOptions.length > 0) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⚠️ Opções Duplicadas')
                    .setDescription('Você tem opções repetidas na sua enquete!')
                    .addFields(
                        { name: '🔄 Opções duplicadas:', value: duplicateOptions.map(opt => `• ${opt}`).join('\n'), inline: false }
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    let duration = null;
    if (durationText) {
        const parsedDuration = parseInt(durationText);
        if (isNaN(parsedDuration) || parsedDuration < 1 || parsedDuration > 10080) {
            return await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Duração Inválida')
                        .setDescription('A duração deve ser entre 1 e 10080 minutos!')
                        .addFields(
                            { name: '⏰ Duração informada:', value: durationText, inline: false },
                            { name: '📝 Exemplos:', value: '• 60 = 1 hora\n• 1440 = 1 dia\n• 10080 = 7 dias', inline: false }
                        )
                        .setTimestamp()
                ],
                ephemeral: true
            });
        }
        duration = parsedDuration;
    }

    // Mostrar modal de configurações adicionais
    const configModal = new ModalBuilder()
        .setCustomId('poll_config_modal')
        .setTitle('⚙️ Configurações Adicionais')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('poll_anonymous')
                    .setLabel('🔐 Enquete anônima? (sim/não)')
                    .setPlaceholder('Digite "sim" para anônima ou "não" para pública')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(3)
                    .setValue('não')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('poll_multiple_votes')
                    .setLabel('🔄 Permitir múltiplos votos? (sim/não)')
                    .setPlaceholder('Digite "sim" para permitir ou "não" para um voto por pessoa')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(3)
                    .setValue('não')
            )
        );

    // Salvar dados temporários
    const tempData = {
        title,
        description,
        options,
        duration,
        authorId: interaction.user.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId
    };

    // Armazenar dados temporários usando pollManager
    pollManager.setTempData(interaction.user.id, tempData);

    try {
        await interaction.showModal(configModal);
    } catch (error) {
        console.error('Erro ao mostrar modal de configuração:', error);
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erro na Configuração')
                    .setDescription('Não foi possível abrir a janela de configuração.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }
}

// Exportar funções para uso em outros módulos
module.exports.handleCreatePollModal = handleCreatePollModal;
module.exports.handlePollConfigModal = handlePollConfigModal;

async function handlePollConfigModal(interaction, client) {
    const anonymousText = interaction.fields.getTextInputValue('poll_anonymous').trim().toLowerCase();
    const multipleVotesText = interaction.fields.getTextInputValue('poll_multiple_votes').trim().toLowerCase();

    const anonymous = anonymousText === 'sim';
    const multipleVotes = multipleVotesText === 'sim';

    const tempData = pollManager.getTempData(interaction.user.id);
    if (!tempData) {
        return await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Sessão Expirada')
                    .setDescription('Por favor, inicie o processo novamente.')
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    // Defer reply
    await interaction.deferReply();

    try {
        // Criar a enquete diretamente
        const pollEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📊 ${tempData.title}`)
            .setAuthor({
                name: `Enquete criada por ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        if (tempData.description) {
            pollEmbed.setDescription(tempData.description);
        }

        const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        const optionsFields = tempData.options.map((option, index) => {
            const emoji = optionEmojis[index] || '📌';
            return `${emoji} **${option}** - 0 votos (0.0%)`;
        });

        pollEmbed.addFields(
            { name: '📋 Opções:', value: optionsFields.join('\n'), inline: false }
        );

        pollEmbed.addFields(
            { name: '⚙️ Configurações:', value: 
                `🔐 **Anônima:** ${anonymous ? 'Sim' : 'Não'}\n` +
                `🔄 **Múltiplos votos:** ${multipleVotes ? 'Sim' : 'Não'}\n` +
                `⏰ **Duração:** ${tempData.duration ? `${tempData.duration} minutos` : 'Ilimitada'}`,
                inline: false }
        );

        pollEmbed.addFields(
            { name: '📈 Status:', value: '🟢 **Ativa**', inline: false }
        );

        pollEmbed.setFooter({ 
            text: `ID: ${interaction.id} • Clique nos botões para votar`,
            iconURL: client.user.displayAvatarURL()
        });

        pollEmbed.setTimestamp();

        const buttons = [];
        for (let i = 0; i < tempData.options.length; i++) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`poll_vote_${i}`)
                    .setLabel(`${i + 1}`)
                    .setEmoji(optionEmojis[i] || '📌')
                    .setStyle(ButtonStyle.Primary)
            );
        }

        if (multipleVotes) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('poll_clear_votes')
                    .setLabel('🗑️ Limpar')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        const rows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
        }

        const message = await interaction.channel.send({
            embeds: [pollEmbed],
            components: rows
        });

        const pollData = {
            title: tempData.title,
            description: tempData.description,
            options: tempData.options,
            messageId: message.id,
            channelId: message.channel.id,
            guildId: tempData.guildId,
            authorId: tempData.authorId,
            duration: tempData.duration ? tempData.duration * 60 * 1000 : null,
            anonymous,
            multipleVotes
        };

        const poll = pollManager.createPoll(pollData);

        // Limpar dados temporários
        pollManager.clearTempData(interaction.user.id);

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Enquete Criada com Sucesso!')
                    .setDescription(`Sua enquete foi criada com ID: \`${poll.id}\``)
                    .addFields(
                        { name: '📊 Título:', value: tempData.title, inline: true },
                        { name: '📋 Opções:', value: `${tempData.options.length} opções`, inline: true },
                        { name: '🔗 Mensagem:', value: `[Ir para enquete](${message.url})`, inline: false }
                    )
                    .setTimestamp()
            ]
        });

    } catch (error) {
        console.error('Erro ao criar enquete via modal:', error);
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erro ao Criar Enquete')
                    .setDescription('Ocorreu um erro ao criar a enquete. Tente novamente.')
                    .setTimestamp()
            ]
        });
    }
}

// Exportar funções para uso em outros módulos
module.exports.handleCreatePollModal = handleCreatePollModal;
module.exports.handlePollConfigModal = handlePollConfigModal;

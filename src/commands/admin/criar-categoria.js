const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('criar-categoria')
        .setDescription('📁 Cria categoria e canais a partir de uma lista')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option
                .setName('categoria')
                .setDescription('📁 Nome da categoria')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('canais')
                .setDescription('📝 Lista de canais (separe por | ou vírgula)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('tipo')
                .setDescription('📋 Tipo dos canais')
                .setRequired(true)
                .addChoices(
                    { name: '💬 Texto', value: 'texto' },
                    { name: '🔊 Voz', value: 'voz' },
                    { name: '📝 Misto (texto + voz)', value: 'misto' }
                )
        )
        .addIntegerOption(option =>
            option
                .setName('posicao')
                .setDescription('📍 Posição da categoria (opcional)')
                .setMinValue(0)
                .setMaxValue(50)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const categoryName = interaction.options.getString('categoria');
        const channelsList = interaction.options.getString('canais');
        const channelType = interaction.options.getString('tipo');
        const position = interaction.options.getInteger('posicao') || 0;

        try {
            // Verificar se já existe categoria com esse nome
            const existingCategory = guild.channels.cache.find(
                c => c.name === categoryName && c.type === ChannelType.GuildCategory
            );

            let category;
            if (existingCategory) {
                category = existingCategory;
                await interaction.followUp({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff9900')
                            .setTitle('⚠️ Categoria Já Existe')
                            .setDescription(`Usando a categoria existente "**${categoryName}**"`)
                            .setTimestamp()
                    ],
                    ephemeral: true
                });
            } else {
                // Criar nova categoria
                category = await guild.channels.create({
                    name: categoryName,
                    type: ChannelType.GuildCategory,
                    position: position
                });
            }

            // Processar lista de canais
            const channelNames = channelsList.split(/[|,]/).map(name => name.trim()).filter(name => name.length > 0);
            
            if (channelNames.length === 0) {
                return await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('❌ Lista Vazia')
                            .setDescription('Nenhum nome de canal válido encontrado!')
                            .addFields(
                                { name: '📝 Formato:', value: 'Use | ou , para separar os nomes', inline: false },
                                { name: '📝 Exemplo:', value: 'chat-geral | memes | anúncios', inline: false }
                            )
                            .setTimestamp()
                    ]
                });
            }

            if (channelNames.length > 50) {
                return await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('❌ Muitos Canais')
                            .setDescription('Máximo de 50 canais permitidos por vez!')
                            .addFields(
                                { name: '📊 Informações:', value: `Você tentou criar ${channelNames.length} canais`, inline: false },
                                { name: '💡 Sugestão:', value: 'Crie em lotes menores', inline: false }
                            )
                            .setTimestamp()
                    ]
                });
            }

            // Criar canais
            const createdChannels = [];
            const errors = [];

            for (let i = 0; i < channelNames.length; i++) {
                const channelName = channelNames[i].toLowerCase().replace(/\s+/g, '-');
                
                try {
                    let newChannel;

                    if (channelType === 'texto') {
                        newChannel = await guild.channels.create({
                            name: channelName,
                            type: ChannelType.GuildText,
                            parent: category,
                            permissionOverwrites: [
                                {
                                    id: guild.id,
                                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                                }
                            ]
                        });
                    } else if (channelType === 'voz') {
                        newChannel = await guild.channels.create({
                            name: channelName,
                            type: ChannelType.GuildVoice,
                            parent: category,
                            permissionOverwrites: [
                                {
                                    id: guild.id,
                                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                                }
                            ]
                        });
                    } else if (channelType === 'misto') {
                        // Criar canal de texto
                        const textChannel = await guild.channels.create({
                            name: channelName,
                            type: ChannelType.GuildText,
                            parent: category,
                            permissionOverwrites: [
                                {
                                    id: guild.id,
                                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                                }
                            ]
                        });

                        // Criar canal de voz
                        const voiceChannel = await guild.channels.create({
                            name: channelName,
                            type: ChannelType.GuildVoice,
                            parent: category,
                            permissionOverwrites: [
                                {
                                    id: guild.id,
                                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                                }
                            ]
                        });

                        createdChannels.push(`💬 ${textChannel.name} e 🔊 ${voiceChannel.name}`);
                        continue;
                    }

                    createdChannels.push(`${channelType === 'texto' ? '💬' : '🔊'} ${newChannel.name}`);
                    
                    // Pequeno delay para evitar rate limit
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    errors.push(`❌ ${channelName}: ${error.message}`);
                }
            }

            // Mensagem de sucesso
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Categoria e Canais Criados!')
                .addFields(
                    { name: '📁 Categoria:', value: category.name, inline: true },
                    { name: '📊 Canais criados:', value: `${createdChannels.length}`, inline: true },
                    { name: '📋 Tipo:', value: channelType === 'texto' ? '💬 Texto' : channelType === 'voz' ? '🔊 Voz' : '📝 Misto', inline: true }
                )
                .setTimestamp();

            if (createdChannels.length > 0) {
                const channelsText = createdChannels.slice(0, 20).join('\n');
                if (createdChannels.length > 20) {
                    successEmbed.addFields(
                        { name: '📋 Canais Criados:', value: `${channelsText}\n... e mais ${createdChannels.length - 20} canais`, inline: false }
                    );
                } else {
                    successEmbed.addFields(
                        { name: '📋 Canais Criados:', value: channelsText, inline: false }
                    );
                }
            }

            if (errors.length > 0) {
                const errorsText = errors.slice(0, 10).join('\n');
                successEmbed.addFields(
                    { name: '⚠️ Erros:', value: errorsText, inline: false }
                );
            }

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Erro ao criar categoria e canais:', error);
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Erro ao Criar')
                        .setDescription('Ocorreu um erro ao criar a categoria e canais.')
                        .addFields(
                            { name: '🔍 Detalhes:', value: error.message, inline: false }
                        )
                        .setTimestamp()
                ]
            });
        }
    }
};

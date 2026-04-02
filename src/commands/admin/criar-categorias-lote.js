const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('criar-categorias-lote')
        .setDescription('📁 Cria múltiplas categorias e canais de uma vez')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option
                .setName('estrutura')
                .setDescription('📋 Estrutura completa (formato: categoria: canal1, canal2 | categoria2: canalA, canalB)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('tipo')
                .setDescription('📋 Tipo padrão dos canais')
                .setRequired(false)
                .addChoices(
                    { name: '💬 Texto', value: 'texto' },
                    { name: '🔊 Voz', value: 'voz' },
                    { name: '📝 Misto', value: 'misto' }
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const structureText = interaction.options.getString('estrutura');
        const defaultType = interaction.options.getString('tipo') || 'texto';

        try {
            // Parsear estrutura
            const categories = [];
            const categoryBlocks = structureText.split('|').map(block => block.trim());
            
            for (const block of categoryBlocks) {
                if (!block.includes(':')) {
                    continue;
                }
                
                const [categoryName, ...channelsParts] = block.split(':');
                const channelsText = channelsParts.join(':').trim();
                
                if (!categoryName.trim() || !channelsText) {
                    continue;
                }
                
                const channelNames = channelsText.split(',').map(name => name.trim()).filter(name => name.length > 0);
                
                if (channelNames.length > 0) {
                    categories.push({
                        name: categoryName.trim(),
                        channels: channelNames,
                        type: defaultType
                    });
                }
            }

            if (categories.length === 0) {
                return await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('❌ Estrutura Inválida')
                            .setDescription('Nenhuma categoria válida encontrada!')
                            .addFields(
                                { name: '📝 Formato:', value: 'categoria: canal1, canal2 | categoria2: canalA, canalB', inline: false },
                                { name: '📝 Exemplo:', value: 'GERAL: chat-geral, memes, anúncios | SUPORTE: ajuda, dúvidas', inline: false }
                            )
                            .setTimestamp()
                    ]
                });
            }

            if (categories.length > 10) {
                return await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('❌ Muitas Categorias')
                            .setDescription('Máximo de 10 categorias permitidas por vez!')
                            .addFields(
                                { name: '📊 Informações:', value: `Você tentou criar ${categories.length} categorias`, inline: false },
                                { name: '💡 Sugestão:', value: 'Crie em lotes menores', inline: false }
                            )
                            .setTimestamp()
                    ]
                });
            }

            // Criar categorias e canais
            const results = [];
            let totalChannels = 0;
            let totalErrors = 0;

            for (let i = 0; i < categories.length; i++) {
                const categoryData = categories[i];
                
                try {
                    // Verificar se categoria já existe
                    const existingCategory = guild.channels.cache.find(
                        c => c.name === categoryData.name && c.type === ChannelType.GuildCategory
                    );

                    let category;
                    if (existingCategory) {
                        category = existingCategory;
                    } else {
                        category = await guild.channels.create({
                            name: categoryData.name,
                            type: ChannelType.GuildCategory,
                            position: i
                        });
                    }

                    // Criar canais da categoria
                    const createdChannels = [];
                    const errors = [];

                    for (const channelName of categoryData.channels) {
                        const cleanName = channelName.toLowerCase().replace(/\s+/g, '-');
                        
                        try {
                            let newChannel;

                            if (categoryData.type === 'texto') {
                                newChannel = await guild.channels.create({
                                    name: cleanName,
                                    type: ChannelType.GuildText,
                                    parent: category,
                                    permissionOverwrites: [
                                        {
                                            id: guild.id,
                                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                                        }
                                    ]
                                });
                            } else if (categoryData.type === 'voz') {
                                newChannel = await guild.channels.create({
                                    name: cleanName,
                                    type: ChannelType.GuildVoice,
                                    parent: category,
                                    permissionOverwrites: [
                                        {
                                            id: guild.id,
                                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                                        }
                                    ]
                                });
                            } else if (categoryData.type === 'misto') {
                                // Criar canal de texto
                                const textChannel = await guild.channels.create({
                                    name: cleanName,
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
                                    name: cleanName,
                                    type: ChannelType.GuildVoice,
                                    parent: category,
                                    permissionOverwrites: [
                                        {
                                            id: guild.id,
                                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                                        }
                                    ]
                                });

                                createdChannels.push(`💬 ${textChannel.name} + 🔊 ${voiceChannel.name}`);
                                totalChannels += 2;
                                continue;
                            }

                            createdChannels.push(`${categoryData.type === 'texto' ? '💬' : '🔊'} ${newChannel.name}`);
                            totalChannels++;
                            
                            // Delay para evitar rate limit
                            await new Promise(resolve => setTimeout(resolve, 100));
                            
                        } catch (error) {
                            errors.push(`❌ ${cleanName}: ${error.message}`);
                            totalErrors++;
                        }
                    }

                    results.push({
                        category: category.name,
                        created: createdChannels.length,
                        errors: errors.length,
                        channels: createdChannels,
                        errorList: errors
                    });

                } catch (error) {
                    results.push({
                        category: categoryData.name,
                        created: 0,
                        errors: categoryData.channels.length,
                        channels: [],
                        errorList: [`❌ Erro na categoria: ${error.message}`]
                    });
                    totalErrors += categoryData.channels.length;
                }
            }

            // Mensagem de resultado
            const resultEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('✅ Criação em Lote Concluída!')
                .addFields(
                    { name: '📁 Categorias processadas:', value: `${categories.length}`, inline: true },
                    { name: '📊 Canais criados:', value: `${totalChannels}`, inline: true },
                    { name: '⚠️ Erros:', value: `${totalErrors}`, inline: true }
                )
                .setTimestamp();

            // Adicionar detalhes por categoria
            for (const result of results) {
                const status = result.errors === 0 ? '✅' : result.created > 0 ? '⚠️' : '❌';
                const fieldValue = result.created > 0 ? 
                    `${result.created} canais criados${result.errors > 0 ? `, ${result.errors} erros` : ''}` : 
                    `${result.errors} erros`;
                
                resultEmbed.addFields(
                    { name: `${status} ${result.category}`, value: fieldValue, inline: true }
                );
            }

            // Adicionar detalhes dos erros se houver
            const allErrors = results.flatMap(r => r.errorList);
            if (allErrors.length > 0 && allErrors.length <= 10) {
                resultEmbed.addFields(
                    { name: '🚨 Detalhes dos Erros:', value: allErrors.join('\n'), inline: false }
                );
            } else if (allErrors.length > 10) {
                resultEmbed.addFields(
                    { name: '🚨 Principais Erros:', value: allErrors.slice(0, 10).join('\n') + `\n... e mais ${allErrors.length - 10} erros`, inline: false }
                );
            }

            await interaction.editReply({ embeds: [resultEmbed] });

        } catch (error) {
            console.error('Erro ao criar categorias em lote:', error);
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Erro na Criação')
                        .setDescription('Ocorreu um erro ao processar a estrutura.')
                        .addFields(
                            { name: '🔍 Detalhes:', value: error.message, inline: false }
                        )
                        .setTimestamp()
                ]
            });
        }
    }
};

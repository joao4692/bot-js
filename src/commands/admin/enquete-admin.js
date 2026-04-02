const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const pollManager = require('../../utils/pollManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enquete-admin')
        .setDescription('🔧 Painel administrativo de enquetes')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('📊 Ver estatísticas globais das enquetes')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('cleanup')
                .setDescription('🧹 Limpar enquetes expiradas')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('validate')
                .setDescription('🔍 Validar integridade dos dados')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('backup')
                .setDescription('💾 Criar backup das enquetes')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('👤 Ver enquetes de um usuário')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuário para verificar')
                        .setRequired(true)
                )
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'stats':
                await handleStats(interaction, client);
                break;
            case 'cleanup':
                await handleCleanup(interaction, client);
                break;
            case 'validate':
                await handleValidate(interaction, client);
                break;
            case 'backup':
                await handleBackup(interaction, client);
                break;
            case 'user':
                await handleUserPolls(interaction, client);
                break;
        }
    }
};

async function handleStats(interaction, client) {
    await interaction.deferReply();

    try {
        const stats = pollManager.getGlobalStats();
        
        const statsEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📊 Estatísticas Globais das Enquetes')
            .setAuthor({
                name: 'Painel Administrativo',
                iconURL: client.user.displayAvatarURL()
            })
            .addFields(
                { name: '📋 Total de Enquetes:', value: `${stats.total}`, inline: true },
                { name: '🟢 Enquetes Ativas:', value: `${stats.active}`, inline: true },
                { name: '🔴 Enquetes Encerradas:', value: `${stats.ended}`, inline: true },
                { name: '🗳️ Total de Votos:', value: `${stats.totalVotes}`, inline: true },
                { name: '📊 Média de Votos:', value: `${stats.averageVotes}`, inline: true },
                { name: '📈 Taxa de Atividade:', value: stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}%` : '0%', inline: true }
            )
            .setFooter({ 
                text: `Sistema de Enquetes • Servidor: ${interaction.guild.name}`,
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [statsEmbed] });
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erro nas Estatísticas')
                    .setDescription('Não foi possível obter as estatísticas das enquetes.')
                    .setTimestamp()
            ]
        });
    }
}

async function handleCleanup(interaction, client) {
    await interaction.deferReply();

    try {
        const cleanedCount = pollManager.cleanupExpiredPolls();
        
        const cleanupEmbed = new EmbedBuilder()
            .setColor(cleanedCount > 0 ? '#00ff00' : '#ff9900')
            .setTitle('🧹 Limpeza de Enquetes')
            .setDescription('Processo de limpeza concluído!')
            .addFields(
                { name: '📊 Enquetes Processadas:', value: `${cleanedCount} enquete(s) limpa(s)`, inline: true },
                { name: '⏰ Data/Hora:', value: new Date().toLocaleString('pt-BR'), inline: true }
            );

        if (cleanedCount > 0) {
            cleanupEmbed.addFields(
                { name: '✅ Resultado:', value: 'Enquetes expiradas foram marcadas como encerradas automaticamente.', inline: false }
            );
        } else {
            cleanupEmbed.addFields(
                { name: 'ℹ️ Informação:', value: 'Nenhuma enquete expirada encontrada.', inline: false }
            );
        }

        cleanupEmbed.setFooter({ 
            text: 'Sistema de Enquetes • Manutenção',
            iconURL: client.user.displayAvatarURL()
        });

        await interaction.editReply({ embeds: [cleanupEmbed] });
    } catch (error) {
        console.error('Erro na limpeza:', error);
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erro na Limpeza')
                    .setDescription('Ocorreu um erro durante o processo de limpeza.')
                    .setTimestamp()
            ]
        });
    }
}

async function handleValidate(interaction, client) {
    await interaction.deferReply();

    try {
        const issues = pollManager.validateData();
        
        const validateEmbed = new EmbedBuilder()
            .setColor(issues.length > 0 ? '#ff9900' : '#00ff00')
            .setTitle('🔍 Validação de Dados')
            .setDescription('Verificação de integridade concluída!')
            .addFields(
                { name: '📊 Status:', value: issues.length > 0 ? '⚠️ Problemas encontrados' : '✅ Tudo OK', inline: true },
                { name: '🔍 Problemas:', value: `${issues.length}`, inline: true },
                { name: '⏰ Verificado em:', value: new Date().toLocaleString('pt-BR'), inline: true }
            );

        if (issues.length > 0) {
            const issuesText = issues.slice(0, 10).join('\n');
            if (issues.length > 10) {
                validateEmbed.addFields(
                    { name: '🚨 Problemas Encontrados:', value: `${issuesText}\n... e mais ${issues.length - 10} problemas`, inline: false }
                );
            } else {
                validateEmbed.addFields(
                    { name: '🚨 Problemas Encontrados:', value: issuesText, inline: false }
                );
            }
        } else {
            validateEmbed.addFields(
                { name: '✅ Resultado:', value: 'Todos os dados das enquetes estão íntegros!', inline: false }
            );
        }

        validateEmbed.setFooter({ 
            text: 'Sistema de Enquetes • Validação',
            iconURL: client.user.displayAvatarURL()
        });

        await interaction.editReply({ embeds: [validateEmbed] });
    } catch (error) {
        console.error('Erro na validação:', error);
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erro na Validação')
                    .setDescription('Ocorreu um erro durante a validação dos dados.')
                    .setTimestamp()
            ]
        });
    }
}

async function handleBackup(interaction, client) {
    await interaction.deferReply();

    try {
        const backupFile = pollManager.createBackup();
        
        const backupEmbed = new EmbedBuilder()
            .setColor(backupFile ? '#00ff00' : '#ff0000')
            .setTitle('💾 Backup de Enquetes')
            .setDescription(backupFile ? 'Backup criado com sucesso!' : 'Falha ao criar backup!')
            .addFields(
                { name: '📊 Status:', value: backupFile ? '✅ Sucesso' : '❌ Falha', inline: true },
                { name: '⏰ Data/Hora:', value: new Date().toLocaleString('pt-BR'), inline: true }
            );

        if (backupFile) {
            backupEmbed.addFields(
                { name: '📁 Arquivo:', value: `\`${backupFile.split('/').pop()}\``, inline: false },
                { name: '💡 Dica:', value: 'O backup contém todas as enquetes e estatísticas atuais.', inline: false }
            );
        } else {
            backupEmbed.addFields(
                { name: '🚨 Erro:', value: 'Verifique o console para mais detalhes.', inline: false }
            );
        }

        backupEmbed.setFooter({ 
            text: 'Sistema de Enquetes • Backup',
            iconURL: client.user.displayAvatarURL()
        });

        await interaction.editReply({ embeds: [backupEmbed] });
    } catch (error) {
        console.error('Erro no backup:', error);
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erro no Backup')
                    .setDescription('Ocorreu um erro ao criar o backup.')
                    .setTimestamp()
            ]
        });
    }
}

async function handleUserPolls(interaction, client) {
    await interaction.deferReply();

    try {
        const user = interaction.options.getUser('usuario');
        const userPolls = pollManager.getPollsByAuthor(user.id);
        
        const userEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`👤 Enquetes de ${user.username}`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: '📊 Total de Enquetes:', value: `${userPolls.length}`, inline: true },
                { name: '🟢 Ativas:', value: `${userPolls.filter(p => p.active).length}`, inline: true },
                { name: '🔴 Encerradas:', value: `${userPolls.filter(p => !p.active).length}`, inline: true }
            );

        if (userPolls.length > 0) {
            const pollList = userPolls.slice(0, 10).map((poll, index) => {
                const status = poll.active ? '🟢' : '🔴';
                const votes = Object.keys(poll.votes || {}).length;
                return `${status} **${index + 1}.** ${poll.title} (${votes} votos)`;
            }).join('\n');

            userEmbed.addFields(
                { name: '📋 Lista de Enquetes:', value: pollList, inline: false }
            );

            if (userPolls.length > 10) {
                userEmbed.addFields(
                    { name: 'ℹ️ Nota:', value: `Mostrando 10 de ${userPolls.length} enquetes.`, inline: false }
                );
            }
        } else {
            userEmbed.addFields(
                { name: '📋 Enquetes:', value: 'Este usuário não criou nenhuma enquete.', inline: false }
            );
        }

        userEmbed.setFooter({ 
            text: `Sistema de Enquetes • Verificado em: ${new Date().toLocaleString('pt-BR')}`,
            iconURL: client.user.displayAvatarURL()
        });

        await interaction.editReply({ embeds: [userEmbed] });
    } catch (error) {
        console.error('Erro ao verificar enquetes do usuário:', error);
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erro na Verificação')
                    .setDescription('Não foi possível verificar as enquetes do usuário.')
                    .setTimestamp()
            ]
        });
    }
}

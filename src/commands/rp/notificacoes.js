const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const advancedSystem = require('../../data/advancedSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('notificacoes')
        .setDescription('[RP] Sistema de notificações e alertas')
        .addSubcommand(sub =>
            sub.setName('ver')
                .setDescription('Ver suas notificações recentes')
        )
        .addSubcommand(sub =>
            sub.setName('configurar')
                .setDescription('Configurar suas preferências de notificação')
                .addStringOption(opt =>
                    opt.setName('tipo')
                        .setDescription('Tipo de notificação')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Pagamentos', value: 'payments' },
                            { name: 'Impostos', value: 'taxes' },
                            { name: 'Eventos', value: 'events' },
                            { name: 'Investimentos', value: 'investments' },
                            { name: 'Saúde', value: 'health' }
                        )
                )
                .addBooleanOption(opt =>
                    opt.setName('ativar')
                        .setDescription('Ativar ou desativar notificações')
                        .setRequired(true)
                )
        ),

    async execute(interaction, client, guildConfig) {
        if (!guildConfig.rp?.enabled) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription('❌ O sistema de RP está desativado neste servidor.')
                ],
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        await interaction.deferReply({ ephemeral: true });

        try {
            switch (subcommand) {
                case 'ver':
                    await handleVer(interaction, guildConfig);
                    break;
                case 'configurar':
                    await handleConfigurar(interaction, guildConfig);
                    break;
            }
        } catch (error) {
            console.error('Erro no comando notificacoes:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription('❌ Ocorreu um erro ao executar o comando.')
                ]
            });
        }
    }
};

async function handleVer(interaction, guildConfig) {
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setTitle('🔔 Suas Notificações')
        .setColor('#0099ff')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    const notifications = [];

    // Notificações de saúde
    if (profile.rp.health.hunger < 30) {
        notifications.push({
            emoji: '🍔',
            title: 'Fome Baixa',
            description: `Sua fome está em ${profile.rp.health.hunger}%. Use o dashboard para se alimentar.`,
            priority: 'high'
        });
    }

    if (profile.rp.health.thirst < 30) {
        notifications.push({
            emoji: '💧',
            title: 'Sede Baixa',
            description: `Sua sede está em ${profile.rp.health.thirst}%. Beba água para se hidratar.`,
            priority: 'high'
        });
    }

    if (profile.rp.health.sleep < 30) {
        notifications.push({
            emoji: '😴',
            title: 'Cansaço',
            description: `Seu nível de sono está em ${profile.rp.health.sleep}%. Descanse para recuperar energia.`,
            priority: 'medium'
        });
    }

    // Notificações financeiras
    if (profile.economy.taxes.incomeTax > 0) {
        notifications.push({
            emoji: '🧾',
            title: 'Impostos Pendentes',
            description: `Você tem $${profile.economy.taxes.incomeTax} de imposto de renda para pagar.`,
            priority: 'high'
        });
    }

    if (profile.legal.fines.filter(f => !f.paid).length > 0) {
        const fineCount = profile.legal.fines.filter(f => !f.paid).length;
        const fineTotal = profile.legal.fines.filter(f => !f.paid).reduce((sum, f) => sum + f.amount, 0);
        
        notifications.push({
            emoji: '📋',
            title: 'Multas Pendentes',
            description: `Você tem ${fineCount} multa(s) no valor total de $${fineTotal}.`,
            priority: 'medium'
        });
    }

    // Notificações de trabalho
    if (profile.work.currentJob && profile.work.performance.score >= 80) {
        notifications.push({
            emoji: '🎉',
            title: 'Elegível para Promoção',
            description: `Sua performance é excelente! Use /trabalho promocao para solicitar uma promoção.`,
            priority: 'low'
        });
    }

    // Notificações de investimentos
    const badInvestments = profile.economy.bank.investments.filter(inv => inv.returns < -100);
    if (badInvestments.length > 0) {
        notifications.push({
            emoji: '📉',
            title: 'Investimentos com Prejuízo',
            description: `Você tem ${badInvestments.length} investimento(s) com prejuízo significativo.`,
            priority: 'medium'
        });
    }

    // Notificações legais
    if (profile.legal.activeWarrants.length > 0) {
        notifications.push({
            emoji: '⚠️',
            title: 'Mandados de Prisão',
            description: `Você tem ${profile.legal.activeWarrants.length} mandado(s) de prisão ativo(s)!`,
            priority: 'critical'
        });
    }

    if (profile.legal.licenses.driver.points >= 15) {
        notifications.push({
            emoji: '🎫',
            title: 'CNH em Risco',
            description: `Sua CNH tem ${profile.legal.licenses.driver.points}/20 pontos. Cuidado para não perder a carteira!`,
            priority: 'high'
        });
    }

    if (notifications.length === 0) {
        embed.setDescription('✅ Você não tem notificações no momento!');
    } else {
        // Ordenar por prioridade
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        notifications.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        notifications.forEach((notification, index) => {
            const priorityColors = {
                critical: '#ff0000',
                high: '#ff6600',
                medium: '#ff9900',
                low: '#ffff00'
            };

            embed.addFields({
                name: `${notification.emoji} ${notification.title}`,
                value: notification.description,
                inline: false
            });
        });

        embed.addFields({
            name: '📊 Resumo',
            value: `**Total:** ${notifications.length} notificações\n**Críticas:** ${notifications.filter(n => n.priority === 'critical').length}`,
            inline: false
        });
    }

    embed.setTimestamp();
    await interaction.editReply({ embeds: [embed] });
}

async function handleConfigurar(interaction, guildConfig) {
    const type = interaction.options.getString('tipo');
    const enable = interaction.options.getBoolean('ativar');

    // Aqui você implementaria a lógica para salvar as preferências do usuário
    // Por enquanto, vamos apenas mostrar uma confirmação

    const typeNames = {
        payments: 'Pagamentos',
        taxes: 'Impostos',
        events: 'Eventos',
        investments: 'Investimentos',
        health: 'Saúde'
    };

    const embed = new EmbedBuilder()
        .setTitle('⚙️ Preferências de Notificação')
        .setColor(enable ? '#00ff00' : '#ff9900')
        .setDescription(`Notificações de **${typeNames[type]}** foram ${enable ? 'ativadas' : 'desativadas'} com sucesso!`)
        .addFields(
            {
                name: '📋 Tipo',
                value: typeNames[type],
                inline: true
            },
            {
                name: '🔔 Status',
                value: enable ? '✅ Ativado' : '❌ Desativado',
                inline: true
            }
        )
        .setFooter({ text: 'Em breve: sistema completo de preferências' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

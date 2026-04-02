const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const advancedSystem = require('../../data/advancedSystem');
const embedSystem = require('../../utils/embedSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('[RP] Seu dashboard pessoal completo')
        .addUserOption(opt =>
            opt.setName('usuario')
                .setDescription('Ver dashboard de outro usuário')
                .setRequired(false)
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

        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        const isOwnProfile = targetUser.id === interaction.user.id;

        await interaction.deferReply({ ephemeral: !isOwnProfile });

        try {
            const profile = await advancedSystem.getUserProfile(targetUser.id, interaction.guildId);
            const dashboard = await createDashboard(profile, targetUser, guildConfig, isOwnProfile);

            await interaction.editReply({ embeds: [dashboard.embed], components: [dashboard.row] });
        } catch (error) {
            console.error('Erro no comando dashboard:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription('❌ Ocorreu um erro ao carregar o dashboard.')
                ]
            });
        }
    }
};

async function createDashboard(profile, user, guildConfig, isOwnProfile) {
    const totalWealth = profile.economy.balance + profile.economy.bank.checking + 
                        profile.economy.bank.savings + 
                        profile.economy.bank.investments.reduce((sum, inv) => sum + inv.amount, 0);

    const embed = embedSystem.createProfile(user, {
        economy: {
            balance: profile.economy.balance,
            bank: profile.economy.bank.checking + profile.economy.bank.savings
        },
        work: {
            job: profile.work.currentJob,
            salary: profile.work.hourlyRate
        },
        stats: {
            'Investimentos': profile.economy.bank.investments.reduce((sum, inv) => sum + inv.amount, 0),
            'Patrimônio Total': totalWealth,
            'Vida': `${profile.rp.health.life}%`,
            'Fome': `${profile.rp.health.hunger}%`,
            'Sede': `${profile.rp.health.thirst}%`,
            'Sono': `${profile.rp.health.sleep}%`
        }
    }, 'rio');

    embed.setDescription('🎯 **Seu resumo completo de RP e Economia**');

    // Top 3 habilidades
    const topSkills = Object.entries(profile.rp.skills)
        .sort(([,a], [,b]) => b.level - a.level)
        .slice(0, 3);

    const skillsText = topSkills.map(([skill, data]) => {
        const skillEmojis = {
            strength: '💪',
            intelligence: '🧠',
            agility: '⚡',
            charisma: '🗣️',
            driving: '🚗',
            shooting: '🔫',
            medical: '🏥',
            mechanics: '🔧'
        };
        return `${skillEmojis[skill] || '⭐'} ${skill}: Nível ${data.level}`;
    }).join(' • ');

    embed.addFields({
        name: '🛠️ Top 3 Habilidades',
        value: skillsText,
        inline: false
    });

    // Status legal
    const finesCount = profile.legal.fines.filter(f => !f.paid).length;
    const warrantsCount = profile.legal.activeWarrants.length;
    
    let legalStatus = '✅ Limpo';
    if (finesCount > 0 || warrantsCount > 0) {
        legalStatus = finesCount > 0 ? `⚠️ ${finesCount} multas` : '⚠️ Problemas legais';
    }

    embed.addFields({
        name: '⚖️ Status Legal',
        value: legalStatus,
        inline: true
    });

    // Progresso do dia
    const today = new Date().toDateString();
    const todayTransactions = profile.economy.transactions
        .filter(t => new Date(t.timestamp).toDateString() === today);

    const todayIncome = todayTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

    const todayExpenses = Math.abs(todayTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0));

    embed.addFields({
        name: '📅 Hoje',
        value: `💰 Receitas: $${todayIncome}\n💸 Despesas: $${todayExpenses}\n💳 Saldo: $${todayIncome - todayExpenses}`,
        inline: false
    });

    // Notificações
    const notifications = [];
    
    if (profile.rp.health.hunger < 30) notifications.push('🍔 Fome baixa');
    if (profile.rp.health.thirst < 30) notifications.push('💧 Sede baixa');
    if (profile.rp.health.sleep < 30) notifications.push('😴 Cansado');
    if (finesCount > 0) notifications.push('📋 Multas pendentes');
    if (profile.economy.taxes.incomeTax > 0) notifications.push('🧾 Impostos a pagar');
    if (profile.work.currentJob && profile.work.performance.score > 80) notifications.push('🎉 Elegível para promoção');

    if (notifications.length > 0) {
        embed.addFields({
            name: '🔔 Notificações',
            value: notifications.join(' • '),
            inline: false
        });
    }

    // Botões de ação (apenas para perfil próprio)
    const row = new ActionRowBuilder();
    
    if (isOwnProfile) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('dashboard_paycheck')
                .setLabel('💰 Receber Pagamento')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('dashboard_eat')
                .setLabel('🍔 Alimentar')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('dashboard_rest')
                .setLabel('😴 Descansar')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('dashboard_refresh')
                .setLabel('🔄 Atualizar')
                .setStyle(ButtonStyle.Primary)
        );
    }

    return { embed, row };
}

// Coletor de interações dos botões
module.exports.buttonHandler = async (interaction, client) => {
    const customId = interaction.customId;
    
    if (!customId.startsWith('dashboard_')) return;
    
    const action = customId.replace('dashboard_', '');
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guild.id);
    
    try {
        switch (action) {
            case 'paycheck':
                await handlePaycheck(interaction, profile);
                break;
            case 'eat':
                await handleEat(interaction, profile);
                break;
            case 'rest':
                await handleRest(interaction, profile);
                break;
            case 'refresh':
                await handleRefresh(interaction, profile);
                break;
        }
    } catch (error) {
        console.error('Erro no handler do dashboard:', error);
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription('❌ Ocorreu um erro ao executar a ação.')
            ],
            ephemeral: true
        });
    }
};

async function handlePaycheck(interaction, profile) {
    if (!profile.work.currentJob) {
        return await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription('⚠️ Você não tem um emprego no momento!')
            ],
            ephemeral: true
        });
    }

    const payment = await advancedSystem.processHourlyPayment(
        interaction.user.id,
        interaction.guild.id
    );

    if (!payment) {
        return await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription('⚠️ Não foi possível processar seu pagamento!')
            ],
            ephemeral: true
        });
    }

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle('💰 Pagamento Recebido!')
            .setColor('#00ff00')
            .setDescription(`Você recebeu $${payment.net} (líquido)`)
            .addFields(
                { name: '💰 Bruto', value: `$${payment.gross}`, inline: true },
                { name: '🧾 Imposto', value: `$${payment.tax}`, inline: true },
                { name: '🎁 Bônus', value: `$${payment.bonus}`, inline: true }
            )
        ],
        ephemeral: true
    });
}

async function handleEat(interaction, profile) {
    if (profile.economy.balance < 50) {
        return await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription('❌ Você precisa de $50 para comer!')
            ],
            ephemeral: true
        });
    }

    profile.economy.balance -= 50;
    profile.rp.health.hunger = Math.min(100, profile.rp.health.hunger + 40);
    profile.rp.health.thirst = Math.min(100, profile.rp.health.thirst + 20);

    await advancedSystem.saveUserProfile(interaction.user.id, interaction.guild.id, profile);

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🍔 Refeição Completa!')
            .setColor('#00ff00')
            .setDescription('Você comeu uma refeição completa por $50')
            .addFields(
                { name: '🍔 Fome', value: `${profile.rp.health.hunger}%`, inline: true },
                { name: '💧 Sede', value: `${profile.rp.health.thirst}%`, inline: true }
            )
        ],
        ephemeral: true
    });
}

async function handleRest(interaction, profile) {
    profile.rp.health.sleep = Math.min(100, profile.rp.health.sleep + 50);
    profile.rp.health.life = Math.min(100, profile.rp.health.life + 10);

    await advancedSystem.saveUserProfile(interaction.user.id, interaction.guild.id, profile);

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle('😴 Descanso Completo!')
            .setColor('#00ff00')
            .setDescription('Você descansou e recuperou energia')
            .addFields(
                { name: '😴 Sono', value: `${profile.rp.health.sleep}%`, inline: true },
                { name: '❤️ Vida', value: `${profile.rp.health.life}%`, inline: true }
            )
        ],
        ephemeral: true
    });
}

async function handleRefresh(interaction, profile) {
    // Processar eventos aleatórios
    const randomEvent = await advancedSystem.processRandomEvent(
        interaction.user.id,
        interaction.guild.id
    );

    // Processar manutenção
    await advancedSystem.processMaintenance(
        interaction.user.id,
        interaction.guild.id
    );

    let message = 'Dashboard atualizado!';
    if (randomEvent) {
        message = `Dashboard atualizado!\n\n🎲 **Evento Aleatório:** ${randomEvent}`;
    }

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🔄 Dashboard Atualizado')
            .setColor('#0099ff')
            .setDescription(message)
        ],
        ephemeral: true
    });
};

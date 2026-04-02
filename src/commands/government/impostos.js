const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const advancedSystem = require('../../data/advancedSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('impostos')
        .setDescription('[GOVERNO] Sistema de impostos e taxas')
        .addSubcommand(sub =>
            sub.setName('consultar')
                .setDescription('Consultar seus impostos pendentes')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Consultar impostos de outro usuário')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('pagar')
                .setDescription('Pagar impostos pendentes')
        )
        .addSubcommand(sub =>
            sub.setName('ipva')
                .setDescription('Gerenciar IPVA de veículos')
                .addStringOption(opt =>
                    opt.setName('veiculo')
                        .setDescription('ID do veículo')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('multas')
                .setDescription('Ver suas multas pendentes')
        )
        .addSubcommand(sub =>
            sub.setName('processar')
                .setDescription('[POLÍCIA] Processar multa para um cidadão')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Cidadão a ser multado')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('tipo')
                        .setDescription('Tipo da multa')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Trânsito', value: 'traffic' },
                            { name: 'Criminal', value: 'criminal' },
                            { name: 'Municipal', value: 'municipal' }
                        )
                )
                .addIntegerOption(opt =>
                    opt.setName('valor')
                        .setDescription('Valor da multa')
                        .setRequired(true)
                        .setMinValue(50)
                        .setMaxValue(10000)
                )
                .addStringOption(opt =>
                    opt.setName('motivo')
                        .setDescription('Motivo da multa')
                        .setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt.setName('pontos')
                        .setDescription('Pontos na carteira (apenas trânsito)')
                        .setMinValue(1)
                        .setMaxValue(7)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

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
        const targetUser = interaction.options.getUser('usuario') || interaction.user;

        await interaction.deferReply({ ephemeral: subcommand !== 'processar' });

        try {
            switch (subcommand) {
                case 'consultar':
                    await handleConsultar(interaction, targetUser, guildConfig);
                    break;
                case 'pagar':
                    await handlePagar(interaction, guildConfig);
                    break;
                case 'ipva':
                    await handleIPVA(interaction, guildConfig);
                    break;
                case 'multas':
                    await handleMultas(interaction, guildConfig);
                    break;
                case 'processar':
                    await handleProcessar(interaction, guildConfig);
                    break;
            }
        } catch (error) {
            console.error('Erro no comando impostos:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription('❌ Ocorreu um erro ao executar o comando.')
                ]
            });
        }
    }
};

async function handleConsultar(interaction, targetUser, guildConfig) {
    const profile = await advancedSystem.getUserProfile(targetUser.id, interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setTitle(`🧾 Consulta de Impostos - ${targetUser.username}`)
        .setColor(guildConfig.embedColor || '#ff9900')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

    // Imposto de renda
    const incomeTax = profile.economy.taxes.incomeTax;
    if (incomeTax > 0) {
        embed.addFields({
            name: '💰 Imposto de Renda Pendente',
            value: `$${incomeTax}`,
            inline: true
        });
    }

    // IPVA
    const ipvaTotal = Object.values(profile.economy.taxes.ipva)
        .filter(ipva => !ipva.paid)
        .reduce((sum, ipva) => sum + ipva.amount, 0);

    if (ipvaTotal > 0) {
        embed.addFields({
            name: '🚗 IPVA Pendente',
            value: `$${ipvaTotal}`,
            inline: true
        });
    }

    // Taxa municipal
    embed.addFields({
        name: '🏛️ Taxa Municipal Mensal',
        value: '$100',
        inline: true
    });

    // Total
    const totalTax = incomeTax + ipvaTotal + 100;
    embed.addFields({
        name: '💳 Total de Impostos',
        value: `$${totalTax}`,
        inline: false
    });

    // Último pagamento
    const lastPaid = new Date(profile.economy.taxes.lastPaid);
    embed.addFields({
        name: '📅 Último Pagamento',
        value: lastPaid.toLocaleDateString('pt-BR'),
        inline: true
    });

    // Status da carteira
    const licenseStatus = profile.legal.licenses.driver.valid ? '✅ Válida' : '❌ Suspensa';
    embed.addFields({
        name: '🎫 Status da CNH',
        value: `${licenseStatus} (${profile.legal.licenses.driver.points}/20 pontos)`,
        inline: true
    });

    if (totalTax > 0) {
        embed.addFields({
            name: '⚠️ Aviso',
            value: 'Você tem impostos pendentes. Use `/impostos pagar` para regularizar sua situação.',
            inline: false
        });
    } else {
        embed.addFields({
            name: '✅ Status',
            value: 'Todos os impostos estão em dia!',
            inline: false
        });
    }

    embed.setTimestamp();
    await interaction.editReply({ embeds: [embed] });
}

async function handlePagar(interaction, guildConfig) {
    const taxes = await advancedSystem.processMonthlyTaxes(interaction.user.id, interaction.guildId);
    
    if (taxes.total === 0) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#00ff00')
                .setDescription('✅ Todos os seus impostos já estão em dia!')
            ]
        });
    }

    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    if (profile.economy.balance < taxes.total) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription(`❌ Saldo insuficiente! Você precisa de $${taxes.total} para pagar os impostos.`)
            ]
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('💳 Impostos Pagos com Sucesso')
        .setColor('#00ff00')
        .setDescription('Todos os seus impostos foram pagos!')
        .addFields(
            {
                name: '💰 Imposto de Renda',
                value: `$${taxes.incomeTax}`,
                inline: true
            },
            {
                name: '🚗 IPVA',
                value: `$${taxes.ipva}`,
                inline: true
            },
            {
                name: '🏛️ Taxa Municipal',
                value: `$${taxes.municipal}`,
                inline: true
            },
            {
                name: '💳 Total Pago',
                value: `$${taxes.total}`,
                inline: false
            }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleIPVA(interaction, guildConfig) {
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    const vehicleId = interaction.options.getString('veiculo');

    if (profile.rp.vehicles.length === 0) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription('⚠️ Você não possui veículos registrados.')
            ]
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('🚗 IPVA - Veículos')
        .setColor(guildConfig.embedColor || '#ff9900')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    if (vehicleId) {
        // IPVA de veículo específico
        const vehicle = profile.rp.vehicles.find(v => v.id === vehicleId);
        if (!vehicle) {
            return await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription('❌ Veículo não encontrado.')
                ]
            });
        }

        const ipvaAmount = Math.floor(vehicle.value * 0.025);
        const ipvaStatus = profile.economy.taxes.ipva[vehicleId]?.paid ? '✅ Pago' : '❌ Pendente';

        embed.addFields({
            name: `🚗 ${vehicle.model}`,
            value: `**Valor:** $${vehicle.value}\n**IPVA (2.5%):** $${ipvaAmount}\n**Status:** ${ipvaStatus}`,
            inline: false
        });
    } else {
        // IPVA de todos os veículos
        let totalIPVA = 0;
        for (const vehicle of profile.rp.vehicles) {
            const ipvaAmount = Math.floor(vehicle.value * 0.025);
            const ipvaStatus = profile.economy.taxes.ipva[vehicle.id]?.paid ? '✅ Pago' : '❌ Pendente';
            
            embed.addFields({
                name: `🚗 ${vehicle.model}`,
                value: `**IPVA:** $${ipvaAmount} - ${ipvaStatus}`,
                inline: true
            });

            if (!profile.economy.taxes.ipva[vehicle.id]?.paid) {
                totalIPVA += ipvaAmount;
            }
        }

        if (totalIPVA > 0) {
            embed.addFields({
                name: '💳 IPVA Total Pendente',
                value: `$${totalIPVA}`,
                inline: false
            });
        }
    }

    embed.setTimestamp();
    await interaction.editReply({ embeds: [embed] });
}

async function handleMultas(interaction, guildConfig) {
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    if (profile.legal.fines.length === 0) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#00ff00')
                .setDescription('✅ Você não possui multas pendentes!')
            ]
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('📋 Suas Multas')
        .setColor(guildConfig.embedColor || '#ff0000')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    let totalFines = 0;
    const unpaidFines = profile.legal.fines.filter(fine => !fine.paid);

    if (unpaidFines.length === 0) {
        embed.setDescription('Todas as suas multas foram pagas!');
    } else {
        unpaidFines.forEach((fine, index) => {
            const dueDate = new Date(fine.dueDate);
            const isOverdue = dueDate < new Date();
            
            embed.addFields({
                name: `📝 Multa #${fine.id}`,
                value: `**Tipo:** ${fine.type}\n**Valor:** $${fine.amount}\n**Motivo:** ${fine.reason}\n**Vencimento:** ${dueDate.toLocaleDateString('pt-BR')} ${isOverdue ? '(Vencida)' : ''}`,
                inline: false
            });

            totalFines += fine.amount;
        });

        embed.addFields({
            name: '💳 Total de Multas',
            value: `$${totalFines}`,
            inline: false
        });

        if (unpaidFines.some(fine => new Date(fine.dueDate) < new Date())) {
            embed.addFields({
                name: '⚠️ Aviso',
                value: 'Você tem multas vencidas! Multas vencidas podem resultar em penalidades adicionais.',
                inline: false
            });
        }
    }

    embed.setTimestamp();
    await interaction.editReply({ embeds: [embed] });
}

async function handleProcessar(interaction, guildConfig) {
    const targetUser = interaction.options.getUser('usuario');
    const type = interaction.options.getString('tipo');
    const amount = interaction.options.getInteger('valor');
    const reason = interaction.options.getString('motivo');
    const points = interaction.options.getInteger('pontos') || 0;

    const fineData = {
        type: type,
        amount: amount,
        reason: reason,
        issuedBy: interaction.user.tag,
        points: type === 'traffic' ? points : 0
    };

    const fine = await advancedSystem.processFine(targetUser.id, interaction.guildId, fineData);

    const embed = new EmbedBuilder()
        .setTitle('📋 Multa Processada')
        .setColor('#ff9900')
        .setDescription(`Multa processada com sucesso para ${targetUser.username}`)
        .addFields(
            {
                name: '👤 Cidadão',
                value: targetUser.tag,
                inline: true
            },
            {
                name: '📝 Tipo',
                value: type === 'traffic' ? 'Trânsito' : type === 'criminal' ? 'Criminal' : 'Municipal',
                inline: true
            },
            {
                name: '💰 Valor',
                value: `$${amount}`,
                inline: true
            },
            {
                name: '📄 Motivo',
                value: reason,
                inline: false
            }
        )
        .setTimestamp();

    if (type === 'traffic' && points > 0) {
        embed.addFields({
            name: '🎫 Pontos na CNH',
            value: `+${points} pontos`,
            inline: true
        });
    }

    // Notificar o cidadão
    try {
        await targetUser.send({
            embeds: [new EmbedBuilder()
                .setTitle('📋 Nova Multa')
                .setColor('#ff0000')
                .setDescription(`Você recebeu uma multa de ${interaction.user.tag}`)
                .addFields(
                    {
                        name: '💰 Valor',
                        value: `$${amount}`,
                        inline: true
                    },
                    {
                        name: '📄 Motivo',
                        value: reason,
                        inline: false
                    },
                    {
                        name: '📅 Vencimento',
                        value: new Date(fine.dueDate).toLocaleDateString('pt-BR'),
                        inline: true
                    }
                )
                .setTimestamp()
            ]
        });
    } catch (error) {
        console.log('Não foi possível notificar o usuário:', error.message);
    }

    await interaction.editReply({ embeds: [embed] });
}

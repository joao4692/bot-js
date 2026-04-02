const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const advancedSystem = require('../../data/advancedSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('investimentos')
        .setDescription('[INVESTIMENTOS] Sistema completo de investimentos unificado')
        .addSubcommand(sub =>
            sub.setName('criar')
                .setDescription('Criar um novo investimento')
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('Tipo de investimento')
                        .addChoices(
                            { name: '💰 Tesouro Direto', value: 'tesouro' },
                            { name: '📈 Ações', value: 'acoes' },
                            { name: '🪙 Criptomoedas', value: 'crypto' },
                            { name: '🏠 Imóveis', value: 'imoveis' },
                            { name: '💎 Metais Preciosos', value: 'metais' }
                        )
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('valor')
                        .setDescription('Valor do investimento')
                        .setMinValue(100)
                        .setMaxValue(1000000)
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('prazo')
                        .setDescription('Prazo em dias')
                        .setMinValue(1)
                        .setMaxValue(365)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('listar')
                .setDescription('Listar seus investimentos')
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('Filtrar por status')
                        .addChoices(
                            { name: '🟢 Ativos', value: 'ativo' },
                            { name: '🔴 Encerrados', value: 'encerrado' },
                            { name: '🟡 Vencendo', value: 'vencendo' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('resgatar')
                .setDescription('Resgatar um investimento')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID do investimento')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('rendimentos')
                .setDescription('Ver seus rendimentos totais')
        )
        .addSubcommand(sub =>
            sub.setName('simular')
                .setDescription('Simular um investimento')
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('Tipo de investimento')
                        .addChoices(
                            { name: '💰 Tesouro Direto', value: 'tesouro' },
                            { name: '📈 Ações', value: 'acoes' },
                            { name: '🪙 Criptomoedas', value: 'crypto' },
                            { name: '🏠 Imóveis', value: 'imoveis' },
                            { name: '💎 Metais Preciosos', value: 'metais' }
                        )
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('valor')
                        .setDescription('Valor do investimento')
                        .setMinValue(100)
                        .setMaxValue(1000000)
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('prazo')
                        .setDescription('Prazo em dias')
                        .setMinValue(1)
                        .setMaxValue(365)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('ranking')
                .setDescription('Ver ranking de investidores')
        )
        .addSubcommand(sub =>
            sub.setName('mercado')
                .setDescription('Ver situação atual do mercado')
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

        await interaction.deferReply({ ephemeral: subcommand === 'simular' });

        try {
            switch (subcommand) {
                case 'criar':
                    await handleCriar(interaction, guildConfig);
                    break;
                case 'listar':
                    await handleListar(interaction, guildConfig);
                    break;
                case 'resgatar':
                    await handleResgatar(interaction, guildConfig);
                    break;
                case 'rendimentos':
                    await handleRendimentos(interaction, guildConfig);
                    break;
                case 'simular':
                    await handleSimular(interaction, guildConfig);
                    break;
                case 'ranking':
                    await handleRanking(interaction, guildConfig);
                    break;
                case 'mercado':
                    await handleMercado(interaction, guildConfig);
                    break;
            }
        } catch (error) {
            console.error('Erro no comando investimentos:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription('❌ Ocorreu um erro ao executar o comando.')
                ]
            });
        }
    }
};

// Configurações dos tipos de investimento
const investmentTypes = {
    tesouro: {
        name: 'Tesouro Direto',
        emoji: '💰',
        risk: 'Baixo',
        minReturn: 0.02,
        maxReturn: 0.08,
        minAmount: 100,
        description: 'Investimento seguro do governo'
    },
    acoes: {
        name: 'Ações',
        emoji: '📈',
        risk: 'Alto',
        minReturn: -0.15,
        maxReturn: 0.25,
        minAmount: 500,
        description: 'Ações de empresas na bolsa'
    },
    crypto: {
        name: 'Criptomoedas',
        emoji: '🪙',
        risk: 'Altíssimo',
        minReturn: -0.40,
        maxReturn: 0.60,
        minAmount: 200,
        description: 'Criptomoedas voláteis'
    },
    imoveis: {
        name: 'Imóveis',
        emoji: '🏠',
        risk: 'Médio',
        minReturn: 0.03,
        maxReturn: 0.12,
        minAmount: 1000,
        description: 'Fundos imobiliários'
    },
    metais: {
        name: 'Metais Preciosos',
        emoji: '💎',
        risk: 'Baixo',
        minReturn: 0.01,
        maxReturn: 0.06,
        minAmount: 300,
        description: 'Ouro, prata e outros metais'
    }
};

async function handleCriar(interaction, guildConfig) {
    const type = interaction.options.getString('tipo');
    const amount = interaction.options.getInteger('valor');
    const days = interaction.options.getInteger('prazo');
    
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    const investmentConfig = investmentTypes[type];

    if (amount < investmentConfig.minAmount) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription(`❌ Valor mínimo para ${investmentConfig.name} é $${investmentConfig.minAmount.toLocaleString('pt-BR')}.`)
            ]
        });
    }

    if (profile.economy.balance < amount) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription('❌ Saldo insuficiente para este investimento!')
            ]
        });
    }

    // Criar investimento
    const investment = {
        id: Date.now().toString(),
        type: type,
        amount: amount,
        initialAmount: amount,
        days: days,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        status: 'ativo',
        returns: 0,
        dailyReturns: []
    };

    // Adicionar ao perfil
    if (!profile.economy.bank.investments) {
        profile.economy.bank.investments = [];
    }
    
    profile.economy.bank.investments.push(investment);
    profile.economy.balance -= amount;

    // Registrar transação
    profile.economy.transactions.push({
        type: 'investment',
        amount: -amount,
        description: `Investimento em ${investmentConfig.name} - ${days} dias`,
        timestamp: new Date().toISOString()
    });

    await advancedSystem.saveUserProfile(interaction.user.id, interaction.guildId, profile);

    const embed = new EmbedBuilder()
        .setTitle(`${investmentConfig.emoji} Investimento Criado`)
        .setColor('#00ff00')
        .setDescription(`Seu investimento em ${investmentConfig.name} foi criado com sucesso!`)
        .addFields(
            {
                name: '💰 Valor Investido',
                value: `$${amount.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '📅 Prazo',
                value: `${days} dias`,
                inline: true
            },
            {
                name: '🎯 Risco',
                value: investmentConfig.risk,
                inline: true
            },
            {
                name: '📊 Retorno Estimado',
                value: `${(investmentConfig.minReturn * 100).toFixed(1)}% a ${(investmentConfig.maxReturn * 100).toFixed(1)}%`,
                inline: false
            },
            {
                name: '🆔 ID',
                value: investment.id,
                inline: true
            },
            {
                name: '📅 Vencimento',
                value: new Date(investment.expiresAt).toLocaleDateString('pt-BR'),
                inline: true
            }
        )
        .setFooter({ text: 'Use /investimentos listar para acompanhar seus investimentos' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleListar(interaction, guildConfig) {
    const status = interaction.options.getString('status');
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    if (!profile.economy.bank.investments || profile.economy.bank.investments.length === 0) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription('⚠️ Você não possui investimentos. Use /investimentos criar para começar!')
            ]
        });
    }

    let investments = profile.economy.bank.investments;
    
    if (status) {
        investments = investments.filter(inv => {
            if (status === 'vencendo') {
                const daysUntilExpiry = Math.ceil((new Date(inv.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
                return daysUntilExpiry <= 7 && inv.status === 'ativo';
            }
            return inv.status === status;
        });
    }

    if (investments.length === 0) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription(`⚠️ Nenhum investimento encontrado com status: ${status}`)
            ]
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`📊 Seus Investimentos${status ? ` - ${status}` : ''}`)
        .setColor('#0099ff')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    let totalInvested = 0;
    let totalReturns = 0;

    investments.forEach((investment, index) => {
        const config = investmentTypes[investment.type];
        const daysUntilExpiry = Math.ceil((new Date(investment.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
        const returnRate = ((investment.amount - investment.initialAmount) / investment.initialAmount * 100).toFixed(2);
        const profit = investment.amount - investment.initialAmount;
        
        totalInvested += investment.initialAmount;
        totalReturns += profit;

        const statusEmoji = investment.status === 'ativo' ? '🟢' : investment.status === 'encerrado' ? '🔴' : '🟡';
        
        embed.addFields({
            name: `${config.emoji} ${config.name} #${index + 1}`,
            value: `**ID:** ${investment.id}\n**Valor:** $${investment.amount.toLocaleString('pt-BR')}\n**Retorno:** ${returnRate > 0 ? '+' : ''}${returnRate}%\n**Lucro/Prejuízo:** ${profit > 0 ? '+' : ''}$${profit.toLocaleString('pt-BR')}\n**Status:** ${statusEmoji} ${investment.status}\n**Vencimento:** ${daysUntilExpiry} dias`,
            inline: false
        });
    });

    embed.addFields(
        {
            name: '💰 Total Investido',
            value: `$${totalInvested.toLocaleString('pt-BR')}`,
            inline: true
        },
        {
            name: '📈 Retorno Total',
            value: `${totalReturns > 0 ? '+' : ''}$${totalReturns.toLocaleString('pt-BR')}`,
            inline: true
        },
        {
            name: '📊 Rentabilidade',
            value: `${((totalReturns / totalInvested) * 100).toFixed(2)}%`,
            inline: true
        }
    )
    .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleResgatar(interaction, guildConfig) {
    const investmentId = interaction.options.getString('id');
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    const investment = profile.economy.bank.investments.find(inv => inv.id === investmentId);
    
    if (!investment) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription('❌ Investimento não encontrado.')
            ]
        });
    }

    if (investment.status === 'encerrado') {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription('⚠️ Este investimento já foi resgatado.')
            ]
        });
    }

    // Verificar se pode resgatar (após o prazo mínimo de 7 dias)
    const daysSinceCreation = Math.ceil((new Date() - new Date(investment.createdAt)) / (1000 * 60 * 60 * 24));
    if (daysSinceCreation < 7) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription(`⚠️ Você precisa esperar ${7 - daysSinceCreation} dias para resgatar este investimento.`)
            ]
        });
    }

    // Processar resgate
    const config = investmentTypes[investment.type];
    const profit = investment.amount - investment.initialAmount;
    
    profile.economy.balance += investment.amount;
    investment.status = 'encerrado';
    investment.rescuedAt = new Date().toISOString();

    // Registrar transação
    profile.economy.transactions.push({
        type: 'investment_rescue',
        amount: investment.amount,
        description: `Resgate de ${config.name} - Lucro: $${profit.toLocaleString('pt-BR')}`,
        timestamp: new Date().toISOString()
    });

    await advancedSystem.saveUserProfile(interaction.user.id, interaction.guildId, profile);

    const embed = new EmbedBuilder()
        .title(`${config.emoji} Investimento Resgatado`)
        .setColor('#00ff00')
        .setDescription(`Seu investimento em ${config.name} foi resgatado com sucesso!`)
        .addFields(
            {
                name: '💰 Valor Resgatado',
                value: `$${investment.amount.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '📈 Lucro/Prejuízo',
                value: `${profit > 0 ? '+' : ''}$${profit.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '📊 Rentabilidade',
                value: `${((profit / investment.initialAmount) * 100).toFixed(2)}%`,
                inline: true
            }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleRendimentos(interaction, guildConfig) {
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    if (!profile.economy.bank.investments || profile.economy.bank.investments.length === 0) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription('⚠️ Você não possui investimentos.')
            ]
        });
    }

    let totalInvested = 0;
    let totalReturns = 0;
    let activeInvestments = 0;
    let closedInvestments = 0;

    const typeStats = {};

    profile.economy.bank.investments.forEach(investment => {
        const profit = investment.amount - investment.initialAmount;
        totalInvested += investment.initialAmount;
        totalReturns += profit;

        if (investment.status === 'ativo') {
            activeInvestments++;
        } else {
            closedInvestments++;
        }

        if (!typeStats[investment.type]) {
            typeStats[investment.type] = {
                invested: 0,
                returns: 0,
                count: 0
            };
        }
        
        typeStats[investment.type].invested += investment.initialAmount;
        typeStats[investment.type].returns += profit;
        typeStats[investment.type].count++;
    });

    const embed = new EmbedBuilder()
        .title('📊 Seus Rendimentos')
        .setColor('#0099ff')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            {
                name: '💰 Total Investido',
                value: `$${totalInvested.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '📈 Total de Retornos',
                value: `${totalReturns > 0 ? '+' : ''}$${totalReturns.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '📊 Rentabilidade Total',
                value: `${((totalReturns / totalInvested) * 100).toFixed(2)}%`,
                inline: true
            },
            {
                name: '🟢 Investimentos Ativos',
                value: activeInvestments.toString(),
                inline: true
            },
            {
                name: '🔴 Investimentos Encerrados',
                value: closedInvestments.toString(),
                inline: true
            }
        )
        .setTimestamp();

    // Adicionar estatísticas por tipo
    if (Object.keys(typeStats).length > 0) {
        const typeFields = [];
        for (const [type, stats] of Object.entries(typeStats)) {
            const config = investmentTypes[type];
            const returnRate = ((stats.returns / stats.invested) * 100).toFixed(2);
            typeFields.push(`${config.emoji} **${config.name}**: $${stats.invested.toLocaleString('pt-BR')} (${returnRate}%)`);
        }
        
        embed.addFields({
            name: '📈 Retornos por Tipo',
            value: typeFields.join('\n'),
            inline: false
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleSimular(interaction, guildConfig) {
    const type = interaction.options.getString('tipo');
    const amount = interaction.options.getInteger('valor');
    const days = interaction.options.getInteger('prazo');
    
    const config = investmentTypes[type];
    
    // Simular retornos
    const minReturn = amount * config.minReturn;
    const maxReturn = amount * config.maxReturn;
    const avgReturn = (minReturn + maxReturn) / 2;
    
    const embed = new EmbedBuilder()
        .title(`${config.emoji} Simulação de Investimento`)
        .setColor('#0099ff')
        .setDescription(`Simulação para ${config.name}`)
        .addFields(
            {
                name: '💰 Valor Investido',
                value: `$${amount.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '📅 Prazo',
                value: `${days} dias`,
                inline: true
            },
            {
                name: '🎯 Risco',
                value: config.risk,
                inline: true
            },
            {
                name: '📉 Pior Cenário',
                value: `$${(amount + minReturn).toLocaleString('pt-BR')} (${(config.minReturn * 100).toFixed(1)}%)`,
                inline: true
            },
            {
                name: '📊 Cenário Médio',
                value: `$${(amount + avgReturn).toLocaleString('pt-BR')} (${((minReturn + maxReturn) / 2 / amount * 100).toFixed(1)}%)`,
                inline: true
            },
            {
                name: '📈 Melhor Cenário',
                value: `$${(amount + maxReturn).toLocaleString('pt-BR')} (${(config.maxReturn * 100).toFixed(1)}%)`,
                inline: true
            }
        )
        .addFields({
            name: '⚠️ Aviso',
            value: 'Esta é apenas uma simulação. Retornos reais podem variar.',
            inline: false
        })
        .setFooter({ text: 'Lembre-se: investimentos de alto risco podem resultar em perdas.' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleRanking(interaction, guildConfig) {
    // Implementar ranking de investidores (simplificado)
    await interaction.editReply({
        embeds: [new EmbedBuilder()
            .setColor('#ff9900')
            .setDescription('⚠️ Ranking de investidores em desenvolvimento.')
        ]
    });
}

async function handleMercado(interaction, guildConfig) {
    const embed = new EmbedBuilder()
        .title('📊 Situação do Mercado')
        .setColor('#0099ff')
        .setDescription('Condições atuais do mercado de investimentos')
        .setTimestamp();

    // Simular condições do mercado
    const marketConditions = {
        tesouro: { status: '🟢 Estável', trend: '↗️ Subindo', recommendation: 'Bom momento para investir' },
        acoes: { status: '🟡 Volátil', trend: '↘️ Quedando', recommendation: 'Cautela recomendada' },
        crypto: { status: '🔴 Instável', trend: '📊 Flutuando', recommendation: 'Alto risco, alto retorno' },
        imoveis: { status: '🟢 Estável', trend: '↗️ Subindo', recommendation: 'Investimento seguro' },
        metais: { status: '🟢 Estável', trend: '→ Estável', recommendation: 'Bom para diversificação' }
    };

    for (const [type, conditions] of Object.entries(marketConditions)) {
        const config = investmentTypes[type];
        embed.addFields({
            name: `${config.emoji} ${config.name}`,
            value: `${conditions.status} ${conditions.trend}\n${conditions.recommendation}`,
            inline: true
        });
    }

    embed.addFields({
        name: '💡 Dica do Dia',
        value: 'Diversifique seus investimentos para reduzir riscos!',
        inline: false
    });

    await interaction.editReply({ embeds: [embed] });
}

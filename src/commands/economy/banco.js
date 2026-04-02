const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const advancedSystem = require('../../data/advancedSystem');
const embedSystem = require('../../utils/embedSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banco')
        .setDescription('[BANCO] Sistema bancário completo unificado')
        .addSubcommand(sub =>
            sub.setName('saldo')
                .setDescription('Ver seu saldo bancário completo')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Ver saldo de outro usuário')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('depositar')
                .setDescription('Depositar dinheiro no banco')
                .addIntegerOption(opt =>
                    opt.setName('valor')
                        .setDescription('Valor para depositar')
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addStringOption(opt =>
                    opt.setName('conta')
                        .setDescription('Tipo de conta')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Conta Corrente', value: 'checking' },
                            { name: 'Poupança', value: 'savings' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('sacar')
                .setDescription('Sacar dinheiro do banco')
                .addIntegerOption(opt =>
                    opt.setName('valor')
                        .setDescription('Valor para sacar')
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addStringOption(opt =>
                    opt.setName('conta')
                        .setDescription('Tipo de conta')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Conta Corrente', value: 'checking' },
                            { name: 'Poupança', value: 'savings' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('transferir')
                .setDescription('Transferir dinheiro para outro usuário')
                .addUserOption(opt =>
                    opt.setName('destinatario')
                        .setDescription('Usuário que receberá')
                        .setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt.setName('valor')
                        .setDescription('Valor para transferir')
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addStringOption(opt =>
                    opt.setName('tipo')
                        .setDescription('Tipo de transferência')
                        .setRequired(true)
                        .addChoices(
                            { name: 'PIX (instantâneo)', value: 'pix' },
                            { name: 'TED (mesmo dia)', value: 'ted' },
                            { name: 'DOC (próximo dia)', value: 'doc' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('investir')
                .setDescription('Investir dinheiro')
                .addIntegerOption(opt =>
                    opt.setName('valor')
                        .setDescription('Valor para investir')
                        .setRequired(true)
                        .setMinValue(100)
                )
                .addStringOption(opt =>
                    opt.setName('tipo')
                        .setDescription('Tipo de investimento')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Ações (alto risco)', value: 'stocks' },
                            { name: 'Tesouro Direto (baixo risco)', value: 'bonds' },
                            { name: 'Criptomoedas (altíssimo risco)', value: 'crypto' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('emprestimo')
                .setDescription('Solicitar empréstimo')
                .addIntegerOption(opt =>
                    opt.setName('valor')
                        .setDescription('Valor do empréstimo')
                        .setRequired(true)
                        .setMinValue(100)
                        .setMaxValue(10000)
                )
                .addIntegerOption(opt =>
                    opt.setName('parcelas')
                        .setDescription('Número de parcelas')
                        .setRequired(true)
                        .addChoices(
                            { name: '3 parcelas', value: 3 },
                            { name: '6 parcelas', value: 6 },
                            { name: '12 parcelas', value: 12 }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('cartoes')
                .setDescription('Gerenciar seus cartões')
        )
        .addSubcommand(sub =>
            sub.setName('extrato')
                .setDescription('Ver extrato de transações')
                .addIntegerOption(opt =>
                    opt.setName('dias')
                        .setDescription('Dias para consultar')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(90)
                )
        )
        .addSubcommand(sub =>
            sub.setName('pagar-parcela')
                .setDescription('Pagar parcela do empréstimo')
        )
        .addSubcommand(sub =>
            sub.setName('investimentos')
                .setDescription('Ver seus investimentos')
        ),

    async execute(interaction, client, guildConfig) {
        if (!guildConfig.rp?.enabled) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription('❌ O sistema de RP está desativado neste servidor.')
                ],
                flags: [MessageFlags.Ephemeral]
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('usuario') || interaction.user;

        // Para subcomando 'saldo', não deferir para poder responder diretamente
        if (subcommand === 'saldo') {
            try {
                await handleSaldo(interaction, targetUser, guildConfig);
            } catch (error) {
                console.error('Erro no comando banco:', error);
                if (!interaction.replied) {
                    await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription('❌ Ocorreu um erro ao executar o comando.')
                        ],
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            }
            return;
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            switch (subcommand) {
                case 'depositar':
                    await handleDepositar(interaction, guildConfig);
                    break;
                case 'sacar':
                    await handleSacar(interaction, guildConfig);
                    break;
                case 'transferir':
                    await handleTransferir(interaction, guildConfig);
                    break;
                case 'investir':
                    await handleInvestir(interaction, guildConfig);
                    break;
                case 'emprestimo':
                    await handleEmprestimo(interaction, guildConfig);
                    break;
                case 'cartoes':
                    await handleCartoes(interaction, guildConfig);
                    break;
                case 'extrato':
                    await handleExtrato(interaction, guildConfig);
                    break;
                case 'pagar-parcela':
                    await handlePagarParcela(interaction, guildConfig);
                    break;
                case 'investimentos':
                    await handleInvestimentos(interaction, guildConfig);
                    break;
            }
        } catch (error) {
            console.error('Erro no comando banco:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription('❌ Ocorreu um erro ao executar o comando.')
                ]
            });
        }
    }
};

async function handleSaldo(interaction, targetUser, guildConfig) {
    const profile = await advancedSystem.getUserProfile(targetUser.id, interaction.guildId);
    
    const totalInvestments = profile.economy.bank.investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalWealth = profile.economy.balance + profile.economy.bank.checking + 
                        profile.economy.bank.savings + totalInvestments;

    const embed = embedSystem.createProfile(targetUser, {
        economy: {
            balance: profile.economy.balance,
            bank: profile.economy.bank.checking + profile.economy.bank.savings
        },
        stats: {
            'Investimentos': totalInvestments,
            'Patrimônio Total': totalWealth
        }
    }, 'rio');

    // Adicionar campos de cartões
    const cartoes = [];
    if (profile.economy.cards.debit.enabled) {
        cartoes.push(`💳 Débito - Limite: $${profile.economy.cards.debit.limit.toLocaleString('pt-BR')}`);
    }
    if (profile.economy.cards.credit.enabled) {
        cartoes.push(`💳 Crédito - Limite: $${profile.economy.cards.credit.limit.toLocaleString('pt-BR')} | Dívida: $${profile.economy.cards.credit.debt.toLocaleString('pt-BR')}`);
    }

    if (cartoes.length > 0) {
        embed.addFields({
            name: '💳 Cartões',
            value: cartoes.join('\n'),
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleDepositar(interaction, guildConfig) {
    const amount = interaction.options.getInteger('valor');
    const accountType = interaction.options.getString('conta');
    
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    if (profile.economy.balance < amount) {
        return await interaction.editReply({
            embeds: [embedSystem.createError('Saldo Insuficiente', 'Você não tem saldo suficiente na carteira para este depósito.')]
        });
    }

    profile.economy.balance -= amount;
    
    if (accountType === 'checking') {
        profile.economy.bank.checking += amount;
    } else {
        profile.economy.bank.savings += amount;
        // Juros de poupança (1% ao mês)
        profile.economy.bank.savings = Math.floor(profile.economy.bank.savings * 1.01);
    }

    // Registrar transação
    profile.economy.transactions.push({
        type: 'deposit',
        amount: -amount,
        description: `Depósito em ${accountType === 'checking' ? 'conta corrente' : 'poupança'}`,
        timestamp: new Date().toISOString()
    });

    await advancedSystem.saveUserProfile(interaction.user.id, interaction.guildId, profile);

    const fields = {
        'Conta': accountType === 'checking' ? 'Conta Corrente' : 'Poupança',
        'Valor': amount
    };

    if (accountType === 'savings') {
        const interest = Math.floor(amount * 0.01);
        fields['Juros Recebidos'] = interest;
    }

    const embed = embedSystem.createMoney('💰 Depósito Realizado', fields, 'rio');
    embed.setDescription(`Você depositou $${amount.toLocaleString('pt-BR')} com sucesso!`);

    await interaction.editReply({ embeds: [embed] });
}

async function handleSacar(interaction, guildConfig) {
    const amount = interaction.options.getInteger('valor');
    const accountType = interaction.options.getString('conta');
    
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    const accountBalance = accountType === 'checking' ? 
        profile.economy.bank.checking : profile.economy.bank.savings;
    
    if (accountBalance < amount) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription(`❌ Saldo insuficiente na ${accountType === 'checking' ? 'conta corrente' : 'poupança'}!`)
            ]
        });
    }

    if (accountType === 'checking') {
        profile.economy.bank.checking -= amount;
    } else {
        profile.economy.bank.savings -= amount;
    }
    
    profile.economy.balance += amount;

    // Registrar transação
    profile.economy.transactions.push({
        type: 'withdraw',
        amount: amount,
        description: `Saque de ${accountType === 'checking' ? 'conta corrente' : 'poupança'}`,
        timestamp: new Date().toISOString()
    });

    await advancedSystem.saveUserProfile(interaction.user.id, interaction.guildId, profile);

    const embed = new EmbedBuilder()
        .setTitle('💸 Saque Realizado')
        .setColor('#00ff00')
        .setDescription(`Você sacou $${amount.toLocaleString('pt-BR')} com sucesso!`)
        .addFields(
            {
                name: '🏦 Conta',
                value: accountType === 'checking' ? 'Conta Corrente' : 'Poupança',
                inline: true
            },
            {
                name: '💵 Valor',
                value: `$${amount.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '💰 Novo Saldo Carteira',
                value: `$${profile.economy.balance.toLocaleString('pt-BR')}`,
                inline: true
            }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleTransferir(interaction, guildConfig) {
    const targetUser = interaction.options.getUser('destinatario');
    const amount = interaction.options.getInteger('valor');
    const transferType = interaction.options.getString('tipo');

    if (targetUser.id === interaction.user.id) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription('❌ Você não pode transferir dinheiro para si mesmo!')
            ]
        });
    }

    try {
        const result = await advancedSystem.processTransfer(
            interaction.user.id,
            interaction.guildId,
            targetUser.id,
            amount,
            transferType
        );

        const embed = new EmbedBuilder()
            .setTitle('💸 Transferência Realizada')
            .setColor('#00ff00')
            .setDescription(`Você transferiu $${amount.toLocaleString('pt-BR')} para ${targetUser.username}`)
            .addFields(
                {
                    name: '👤 Destinatário',
                    value: targetUser.tag,
                    inline: true
                },
                {
                    name: '💰 Valor',
                    value: `$${amount.toLocaleString('pt-BR')}`,
                    inline: true
                },
                {
                    name: '📋 Tipo',
                    value: transferType.toUpperCase(),
                    inline: true
                },
                {
                    name: '💸 Taxa',
                    value: `$${result.fee.toLocaleString('pt-BR')}`,
                    inline: true
                },
                {
                    name: '💳 Total Debitado',
                    value: `$${result.total.toLocaleString('pt-BR')}`,
                    inline: false
                }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        // Notificar destinatário
        try {
            await targetUser.send({
                embeds: [new EmbedBuilder()
                    .setTitle('💰 Dinheiro Recebido')
                    .setColor('#00ff00')
                    .setDescription(`Você recebeu $${amount.toLocaleString('pt-BR')} de ${interaction.user.tag}`)
                    .addFields(
                        {
                            name: '💰 Valor',
                            value: `$${amount.toLocaleString('pt-BR')}`,
                            inline: true
                        },
                        {
                            name: '📋 Tipo',
                            value: transferType.toUpperCase(),
                            inline: true
                        }
                    )
                    .setTimestamp()
                ]
            });
        } catch (error) {
            console.log('Não foi possível notificar o destinatário:', error.message);
        }

    } catch (error) {
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription(`❌ ${error.message}`)
            ]
        });
    }
}

async function handleInvestir(interaction, guildConfig) {
    const amount = interaction.options.getInteger('valor');
    const investmentType = interaction.options.getString('tipo');
    
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    if (profile.economy.balance < amount) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription('❌ Saldo insuficiente para investir!')
            ]
        });
    }

    await advancedSystem.createAccount(interaction.user.id, interaction.guildId, 'investment');
    
    profile.economy.balance -= amount;
    
    const investment = {
        type: investmentType,
        amount: amount,
        initialAmount: amount,
        risk: investmentType === 'stocks' ? 'high' : investmentType === 'bonds' ? 'low' : 'very_high',
        returns: 0,
        createdAt: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
    };

    profile.economy.bank.investments.push(investment);

    // Registrar transação
    profile.economy.transactions.push({
        type: 'investment',
        amount: -amount,
        description: `Investimento em ${investmentType}`,
        timestamp: new Date().toISOString()
    });

    await advancedSystem.saveUserProfile(interaction.user.id, interaction.guildId, profile);

    const riskEmoji = {
        stocks: '📈',
        bonds: '📊',
        crypto: '🪙'
    };

    const riskText = {
        stocks: 'Alto risco - Alto retorno potencial',
        bonds: 'Baixo risco - Retorno estável',
        crypto: 'Altíssimo risco - Retorno extremo'
    };

    const embed = new EmbedBuilder()
        .setTitle(`${riskEmoji[investmentType]} Investimento Realizado`)
        .setColor('#0099ff')
        .setDescription(`Você investiu $${amount.toLocaleString('pt-BR')} em ${investmentType}`)
        .addFields(
            {
                name: '💰 Valor',
                value: `$${amount.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '📊 Tipo',
                value: investmentType.toUpperCase(),
                inline: true
            },
            {
                name: '⚠️ Risco',
                value: riskText[investmentType],
                inline: false
            }
        )
        .setFooter({ text: 'Use /banco investimentos para acompanhar seus investimentos' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleEmprestimo(interaction, guildConfig) {
    const amount = interaction.options.getInteger('valor');
    const installments = interaction.options.getInteger('parcelas');
    
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    // Verificar se já tem empréstimo ativo
    if (profile.economy.bank.loan) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription('❌ Você já possui um empréstimo ativo!')
            ]
        });
    }

    // Calcular juros (10% para 3 parcelas, 15% para 6, 20% para 12)
    const interestRates = { 3: 0.10, 6: 0.15, 12: 0.20 };
    const interestRate = interestRates[installments];
    const totalInterest = Math.floor(amount * interestRate);
    const totalAmount = amount + totalInterest;
    const installmentAmount = Math.floor(totalAmount / installments);

    // Aprovar empréstimo automaticamente
    profile.economy.balance += amount;
    profile.economy.bank.loan = {
        amount: totalAmount,
        originalAmount: amount,
        interest: totalInterest,
        installments: installments,
        currentInstallment: 0,
        installmentAmount: installmentAmount,
        nextPayment: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Próxima semana
        createdAt: new Date().toISOString()
    };

    // Registrar transação
    profile.economy.transactions.push({
        type: 'loan',
        amount: amount,
        description: `Empréstimo aprovado - ${installments} parcelas`,
        timestamp: new Date().toISOString()
    });

    await advancedSystem.saveUserProfile(interaction.user.id, interaction.guildId, profile);

    const embed = new EmbedBuilder()
        .setTitle('💰 Empréstimo Aprovado')
        .setColor('#00ff00')
        .setDescription(`Seu empréstimo foi aprovado e o dinheiro já está na sua conta!`)
        .addFields(
            {
                name: '💰 Valor Recebido',
                value: `$${amount.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '📊 Parcelas',
                value: `${installments}x`,
                inline: true
            },
            {
                name: '💳 Valor da Parcela',
                value: `$${installmentAmount.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '📈 Juros Totais',
                value: `$${totalInterest.toLocaleString('pt-BR')} (${Math.floor(interestRate * 100)}%)`,
                inline: true
            },
            {
                name: '💳 Total a Pagar',
                value: `$${totalAmount.toLocaleString('pt-BR')}`,
                inline: false
            },
            {
                name: '📅 Próximo Vencimento',
                value: new Date(profile.economy.bank.loan.nextPayment).toLocaleDateString('pt-BR'),
                inline: true
            }
        )
        .setFooter({ text: 'Use /banco pagar-parcela para pagar suas parcelas' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleCartoes(interaction, guildConfig) {
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setTitle('💳 Seus Cartões')
        .setColor('#0099ff')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    // Cartão de débito
    if (profile.economy.cards.debit.enabled) {
        embed.addFields({
            name: '💳 Cartão de Débito',
            value: `**Status:** ✅ Ativo\n**Limite:** $${profile.economy.cards.debit.limit.toLocaleString('pt-BR')}\n**Vinculado:** Conta Corrente`,
            inline: false
        });
    } else {
        embed.addFields({
            name: '💳 Cartão de Débito',
            value: '**Status:** ❌ Inativo\n**Como ativar:** Use /banco solicitar-cartao debito',
            inline: false
        });
    }

    // Cartão de crédito
    if (profile.economy.cards.credit.enabled) {
        const availableLimit = profile.economy.cards.credit.limit - profile.economy.cards.credit.debt;
        embed.addFields({
            name: '💳 Cartão de Crédito',
            value: `**Status:** ✅ Ativo\n**Limite:** $${profile.economy.cards.credit.limit.toLocaleString('pt-BR')}\n**Dívida:** $${profile.economy.cards.credit.debt.toLocaleString('pt-BR')}\n**Disponível:** $${availableLimit.toLocaleString('pt-BR')}`,
            inline: false
        });
    } else {
        embed.addFields({
            name: '💳 Cartão de Crédito',
            value: '**Status:** ❌ Inativo\n**Como ativar:** Use /banco solicitar-cartao credito\n**Requisito:** Bom histórico de crédito',
            inline: false
        });
    }

    embed.setTimestamp();
    await interaction.editReply({ embeds: [embed] });
}

async function handleExtrato(interaction, guildConfig) {
    const days = interaction.options.getInteger('dias') || 30;
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const transactions = profile.economy.transactions
        .filter(t => new Date(t.timestamp) >= cutoffDate)
        .slice(-20) // Últimas 20 transações
        .reverse();

    if (transactions.length === 0) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription(`⚠️ Nenhuma transação encontrada nos últimos ${days} dias.`)
            ]
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`📊 Extrato - Últimos ${days} dias`)
        .setColor('#0099ff')
        .setDescription('Suas transações recentes');

    let balance = profile.economy.balance;
    transactions.forEach((transaction, index) => {
        const date = new Date(transaction.timestamp);
        const emoji = transaction.amount > 0 ? '💰' : '💸';
        
        embed.addFields({
            name: `${emoji} Transação #${index + 1}`,
            value: `**Valor:** ${transaction.amount > 0 ? '+' : ''}$${transaction.amount.toLocaleString('pt-BR')}\n**Descrição:** ${transaction.description}\n**Data:** ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`,
            inline: false
        });
    });

    embed.setTimestamp();
    await interaction.editReply({ embeds: [embed] });
}

async function handlePagarParcela(interaction, guildConfig) {
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    if (!profile.economy.bank.loan) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription('⚠️ Você não possui empréstimos ativos.')
            ]
        });
    }

    const loan = profile.economy.bank.loan;
    const installmentAmount = loan.installmentAmount;

    if (profile.economy.balance < installmentAmount) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription(`❌ Saldo insuficiente! Você precisa de $${installmentAmount.toLocaleString('pt-BR')} para pagar a parcela.`)
            ]
        });
    }

    // Pagar parcela
    profile.economy.balance -= installmentAmount;
    loan.currentInstallment++;
    loan.amount -= installmentAmount;

    // Registrar transação
    profile.economy.transactions.push({
        type: 'loan_payment',
        amount: -installmentAmount,
        description: `Pagamento de parcela ${loan.currentInstallment}/${loan.installments}`,
        timestamp: new Date().toISOString()
    });

    // Verificar se empréstimo foi pago
    if (loan.currentInstallment >= loan.installments || loan.amount <= 0) {
        profile.economy.bank.loan = null;
        
        await advancedSystem.saveUserProfile(interaction.user.id, interaction.guildId, profile);
        
        const embed = new EmbedBuilder()
            .setTitle('🎉 Empréstimo Pago!')
            .setColor('#00ff00')
            .setDescription('Parabéns! Você quitou seu empréstimo!')
            .addFields(
                {
                    name: '💰 Valor Pago',
                    value: `$${installmentAmount.toLocaleString('pt-BR')}`,
                    inline: true
                },
                {
                    name: '📊 Parcela',
                    value: `${loan.currentInstallment}/${loan.installments}`,
                    inline: true
                }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } else {
        // Atualizar próxima data de pagamento
        loan.nextPayment = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        
        await advancedSystem.saveUserProfile(interaction.user.id, interaction.guildId, profile);
        
        const embed = new EmbedBuilder()
            .setTitle('💳 Parcela Paga')
            .setColor('#00ff00')
            .setDescription('Sua parcela foi paga com sucesso!')
            .addFields(
                {
                    name: '💰 Valor Pago',
                    value: `$${installmentAmount.toLocaleString('pt-BR')}`,
                    inline: true
                },
                {
                    name: '📊 Progresso',
                    value: `${loan.currentInstallment}/${loan.installments} parcelas`,
                    inline: true
                },
                {
                    name: '💳 Saldo Devedor',
                    value: `$${loan.amount.toLocaleString('pt-BR')}`,
                    inline: true
                },
                {
                    name: '📅 Próximo Vencimento',
                    value: new Date(loan.nextPayment).toLocaleDateString('pt-BR'),
                    inline: true
                }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
}

async function handleInvestimentos(interaction, guildConfig) {
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    if (profile.economy.bank.investments.length === 0) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription('⚠️ Você não possui investimentos. Use /banco investir para começar!')
            ]
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('📈 Seus Investimentos')
        .setColor('#0099ff')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    let totalInvested = 0;
    let totalReturns = 0;

    profile.economy.bank.investments.forEach((investment, index) => {
        const returnRate = ((investment.amount - investment.initialAmount) / investment.initialAmount * 100).toFixed(2);
        const profit = investment.amount - investment.initialAmount;
        
        totalInvested += investment.initialAmount;
        totalReturns += profit;

        const typeEmojis = {
            stocks: '📈',
            bonds: '📊',
            crypto: '🪙'
        };

        const riskColors = {
            high: '🔴',
            low: '🟢',
            very_high: '🟡'
        };

        embed.addFields({
            name: `${typeEmojis[investment.type] || '💼'} Investimento #${index + 1}`,
            value: `**Tipo:** ${investment.type.toUpperCase()}\n**Valor Atual:** $${investment.amount.toLocaleString('pt-BR')}\n**Retorno:** ${returnRate > 0 ? '+' : ''}${returnRate}%\n**Lucro/Prejuízo:** ${profit > 0 ? '+' : ''}$${profit.toLocaleString('pt-BR')}\n**Risco:** ${riskColors[investment.risk]}`,
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
    .setFooter({ text: 'Investimentos são atualizados automaticamente a cada 6 horas' })
    .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

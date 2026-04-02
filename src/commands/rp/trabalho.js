const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const advancedSystem = require('../../data/advancedSystem');
const embedSystem = require('../../utils/embedSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trabalho')
        .setDescription('[RP] Sistema de trabalho unificado')
        .addSubcommand(sub =>
            sub.setName('perfil')
                .setDescription('Ver seu perfil profissional')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Ver perfil de outro usuário')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('pagamento')
                .setDescription('Receber pagamento horário')
        )
        .addSubcommand(sub =>
            sub.setName('promocao')
                .setDescription('Solicitar promoção (se disponível)')
        )
        .addSubcommand(sub =>
            sub.setName('beneficios')
                .setDescription('Ver seus benefícios atuais')
        )
        .addSubcommand(sub =>
            sub.setName('historico')
                .setDescription('Ver histórico de pagamentos')
        )
        .addSubcommand(sub =>
            sub.setName('trabalhar')
                .setDescription('Trabalhar manualmente (ganhar dinheiro)')
        )
        .addSubcommand(sub =>
            sub.setName('diaria')
                .setDescription('Receber sua diária básica')
        )
        .addSubcommand(sub =>
            sub.setName('ponto')
                .setDescription('Bater ponto (sistema simplificado)')
        )
        .addSubcommand(sub =>
            sub.setName('empregos')
                .setDescription('Ver empregos disponíveis')
        )
        .addSubcommand(sub =>
            sub.setName('contratar')
                .setDescription('Contratar-se em um emprego')
                .addStringOption(opt =>
                    opt.setName('emprego')
                        .setDescription('Emprego desejado')
                        .setRequired(true)
                        .addChoices(
                            { name: '👮 Policial', value: 'police' },
                            { name: '🏥 Médico', value: 'medic' },
                            { name: '🔧 Mecânico', value: 'mechanic' },
                            { name: '🚗 Motorista', value: 'driver' },
                            { name: '👨‍💼 Empresário', value: 'business' },
                            { name: '🌾 Fazendeiro', value: 'farmer' },
                            { name: '🏹 Caçador', value: 'hunter' },
                            { name: '⛏️ Minerador', value: 'miner' }
                        )
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
        const targetUser = interaction.options.getUser('usuario') || interaction.user;

        await interaction.deferReply({ ephemeral: subcommand !== 'perfil' });

        try {
            switch (subcommand) {
                case 'perfil':
                    await handlePerfil(interaction, targetUser, guildConfig);
                    break;
                case 'pagamento':
                    await handlePagamento(interaction, guildConfig);
                    break;
                case 'promocao':
                    await handlePromocao(interaction, guildConfig);
                    break;
                case 'beneficios':
                    await handleBeneficios(interaction, guildConfig);
                    break;
                case 'historico':
                    await handleHistorico(interaction, guildConfig);
                    break;
                case 'trabalhar':
                    await handleTrabalhar(interaction, guildConfig);
                    break;
                case 'diaria':
                    await handleDiaria(interaction, guildConfig);
                    break;
                case 'ponto':
                    await handlePonto(interaction, guildConfig);
                    break;
                case 'empregos':
                    await handleEmpregos(interaction, guildConfig);
                    break;
                case 'contratar':
                    await handleContratar(interaction, guildConfig);
                    break;
            }
        } catch (error) {
            console.error('Erro no comando trabalho:', error);
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription('❌ Ocorreu um erro ao executar o comando.')
                ]
            });
        }
    }
};

async function handlePerfil(interaction, targetUser, guildConfig) {
    const profile = await advancedSystem.getUserProfile(targetUser.id, interaction.guildId);
    
    const embed = embedSystem.createWork('Perfil Profissional', {
        job: profile.work.currentJob ? `${profile.work.currentJob} - ${profile.work.position}` : 'Desempregado',
        salary: profile.work.hourlyRate,
        performance: profile.work.performance.score
    }, 'rio');

    // Adicionar benefícios
    const beneficios = [];
    if (profile.work.benefits.mealTicket) beneficios.push('🍔 Vale-refeição');
    if (profile.work.benefits.healthPlan) beneficios.push('🏥 Plano de saúde');
    if (profile.work.benefits.transportation) beneficios.push('🚗 Auxílio transporte');

    if (beneficios.length > 0) {
        embed.addFields({
            name: '🎁 Benefícios Ativos',
            value: beneficios.join(' • '),
            inline: false
        });
    }

    // Adicionar habilidades relevantes
    if (profile.work.currentJob) {
        const jobSkills = advancedSystem.getJobSkills(profile.work.currentJob);
        const skillsText = jobSkills.map(skill => {
            const skillData = profile.rp.skills[skill];
            return `**${skill}**: Nível ${skillData.level} (${skillData.xp} XP)`;
        }).join('\n');

        embed.addFields({
            name: '🛠️ Habilidades Relevantes',
            value: skillsText,
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed] });
}

async function handlePagamento(interaction, guildConfig) {
    const payment = await advancedSystem.processHourlyPayment(
        interaction.user.id,
        interaction.guildId
    );

    if (!payment) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription('⚠️ Você não tem um emprego no momento.')
            ]
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('💳 Pagamento Recebido')
        .setColor('#00ff00')
        .setDescription('Seu pagamento horário foi processado com sucesso!')
        .addFields(
            {
                name: '💰 Salário Bruto',
                value: `$${payment.gross.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '🧾 Imposto de Renda (15%)',
                value: `$${payment.tax.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '🎁 Bônus de Performance',
                value: `$${payment.bonus.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '💵 Salário Líquido',
                value: `$${payment.net.toLocaleString('pt-BR')}`,
                inline: false
            }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handlePromocao(interaction, guildConfig) {
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    if (!profile.work.currentJob) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription('⚠️ Você não tem um emprego no momento.')
            ]
        });
    }

    // Verificar se tem XP suficiente para promoção
    const jobSkills = advancedSystem.getJobSkills(profile.work.currentJob);
    let canPromote = false;
    
    for (const skill of jobSkills) {
        const skillData = profile.rp.skills[skill];
        const xpNeeded = skillData.level * 100;
        
        if (skillData.xp >= xpNeeded && skillData.level < 10) {
            canPromote = true;
            break;
        }
    }

    if (!canPromote) {
        const nextLevel = jobSkills.map(skill => {
            const skillData = profile.rp.skills[skill];
            const xpNeeded = skillData.level * 100;
            return `**${skill}**: ${skillData.xp}/${xpNeeded} XP`;
        }).join('\n');

        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('📈 Promoção Indisponível')
                .setDescription('Você ainda não tem experiência suficiente para uma promoção.')
                .addFields({
                    name: '📊 Progresso para Próximo Nível',
                    value: nextLevel,
                    inline: false
                })
            ]
        });
    }

    // Processar promoção
    await advancedSystem.processPromotion(profile);
    await advancedSystem.saveUserProfile(interaction.user.id, interaction.guildId, profile);

    const embed = new EmbedBuilder()
        .setTitle('🎉 Promoção Concedida!')
        .setColor('#00ff00')
        .setDescription('Parabéns! Você foi promovido!')
        .addFields(
            {
                name: '🏢 Nova Posição',
                value: profile.work.position,
                inline: true
            },
            {
                name: '💰 Novo Salário/Hora',
                value: `$${profile.work.hourlyRate.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '📈 Total de Promoções',
                value: profile.work.performance.promotions.toString(),
                inline: true
            }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleBeneficios(interaction, guildConfig) {
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setTitle('🎁 Seus Benefícios')
        .setColor(guildConfig.embedColor || '#0099ff')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    const beneficiosAtivos = [];
    const beneficiosInativos = [];

    if (profile.work.benefits.mealTicket) {
        beneficiosAtivos.push('🍔 **Vale-refeição** - $50/dia');
    } else {
        beneficiosInativos.push('🍔 Vale-refeição (disponível na 3ª promoção)');
    }

    if (profile.work.benefits.healthPlan) {
        beneficiosAtivos.push('🏥 **Plano de saúde** - Cobertura completa');
    } else {
        beneficiosInativos.push('🏥 Plano de saúde (disponível na 5ª promoção)');
    }

    if (profile.work.benefits.transportation) {
        beneficiosAtivos.push('🚗 **Auxílio transporte** - $100/semana');
    } else {
        beneficiosInativos.push('🚗 Auxílio transporte (disponível na 10ª promoção)');
    }

    if (beneficiosAtivos.length > 0) {
        embed.addFields({
            name: '✅ Benefícios Ativos',
            value: beneficiosAtivos.join('\n'),
            inline: false
        });
    }

    if (beneficiosInativos.length > 0) {
        embed.addFields({
            name: '🔒 Benefícios Bloqueados',
            value: beneficiosInativos.join('\n'),
            inline: false
        });
    }

    embed.addFields({
        name: '📊 Progresso de Benefícios',
        value: `Promoções atuais: ${profile.work.performance.promotions}/10`,
        inline: false
    })
    .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleHistorico(interaction, guildConfig) {
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    // Filtrar transações de salário
    const salaryTransactions = profile.economy.transactions
        .filter(t => t.type === 'salary')
        .slice(-10) // Últimos 10 pagamentos
        .reverse();

    if (salaryTransactions.length === 0) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription('⚠️ Nenhum pagamento registrado.')
            ]
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('📊 Histórico de Pagamentos')
        .setColor(guildConfig.embedColor || '#0099ff')
        .setDescription('Últimos 10 pagamentos recebidos');

    salaryTransactions.forEach((transaction, index) => {
        const date = new Date(transaction.timestamp);
        embed.addFields({
            name: `💰 Pagamento #${index + 1}`,
            value: `**Valor:** $${transaction.amount.toLocaleString('pt-BR')}\n**Data:** ${date.toLocaleDateString('pt-BR')}\n**Detalhes:** ${transaction.description}`,
            inline: false
        });
    });

    embed.addFields({
        name: '📈 Estatísticas',
        value: `**Total recebido:** $${salaryTransactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString('pt-BR')}\n**Média:** $${Math.floor(salaryTransactions.reduce((sum, t) => sum + t.amount, 0) / salaryTransactions.length).toLocaleString('pt-BR')}`,
        inline: false
    })
    .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleTrabalhar(interaction, guildConfig) {
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    if (!profile.work.currentJob) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription('⚠️ Você precisa de um emprego para trabalhar. Use `/trabalho empregos` para ver as opções.')
            ]
        });
    }

    // Cooldown de 5 minutos
    const lastWork = profile.lastWork || 0;
    const now = Date.now();
    const cooldown = 5 * 60 * 1000; // 5 minutos

    if (now - lastWork < cooldown) {
        const timeLeft = Math.ceil((cooldown - (now - lastWork)) / 1000 / 60);
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription(`⏰ Você precisa esperar ${timeLeft} minutos para trabalhar novamente.`)
            ]
        });
    }

    // Calcular pagamento baseado no trabalho e performance
    const basePayment = profile.work.hourlyRate;
    const performanceBonus = Math.floor(profile.work.performance.score * 0.05 * basePayment);
    const totalPayment = basePayment + performanceBonus;

    // Desconto de imposto
    const tax = Math.floor(totalPayment * 0.15);
    const netPayment = totalPayment - tax;

    // Atualizar perfil
    profile.economy.balance += netPayment;
    profile.economy.taxes.incomeTax += tax;
    profile.lastWork = now;

    // XP em habilidades
    await advancedSystem.addWorkSkillXP(profile, 5);

    // Registrar transação
    profile.economy.transactions.push({
        type: 'work',
        amount: netPayment,
        description: `Trabalho manual - ${profile.work.currentJob}`,
        timestamp: new Date().toISOString()
    });

    await advancedSystem.saveUserProfile(interaction.user.id, interaction.guildId, profile);

    const embed = new EmbedBuilder()
        .setTitle('💼 Trabalho Concluído')
        .setColor('#00ff00')
        .setDescription(`Você trabalhou como ${profile.work.currentJob} e recebeu seu pagamento!`)
        .addFields(
            {
                name: '💰 Pagamento Base',
                value: `$${basePayment.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '🎁 Bônus Performance',
                value: `$${performanceBonus.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '🧾 Imposto',
                value: `$${tax.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '💵 Recebido',
                value: `$${netPayment.toLocaleString('pt-BR')}`,
                inline: false
            }
        )
        .setFooter({ text: 'Próximo trabalho disponível em 5 minutos' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleDiaria(interaction, guildConfig) {
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    // Cooldown de 24 horas
    const lastDaily = profile.lastDaily || 0;
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24 horas

    if (now - lastDaily < cooldown) {
        const timeLeft = Math.ceil((cooldown - (now - lastDaily)) / 1000 / 60 / 60);
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription(`⏰ Você precisa esperar ${timeLeft} horas para receber sua diária novamente.`)
            ]
        });
    }

    const dailyAmount = 200; // Valor fixo da diária
    profile.economy.balance += dailyAmount;
    profile.lastDaily = now;

    // Registrar transação
    profile.economy.transactions.push({
        type: 'daily',
        amount: dailyAmount,
        description: 'Diária básica recebida',
        timestamp: new Date().toISOString()
    });

    await advancedSystem.saveUserProfile(interaction.user.id, interaction.guildId, profile);

    const embed = new EmbedBuilder()
        .setTitle('💰 Diária Recebida')
        .setColor('#00ff00')
        .setDescription('Sua diária básica foi recebida com sucesso!')
        .addFields(
            {
                name: '💰 Valor',
                value: `$${dailyAmount.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '⏰ Próxima diária',
                value: 'Em 24 horas',
                inline: true
            }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handlePonto(interaction, guildConfig) {
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);
    
    if (!profile.work.currentJob) {
        return await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#ff9900')
                .setDescription('⚠️ Você precisa de um emprego para bater ponto.')
            ]
        });
    }

    // Sistema de ponto simplificado
    const now = new Date();
    const hour = now.getHours();
    
    let message = '';
    let bonus = 0;
    
    if (hour >= 8 && hour <= 9) {
        message = '✅ Ponto batido no horário! Bônus de pontualidade recebido.';
        bonus = 50;
    } else if (hour >= 9 && hour <= 10) {
        message = '⚠️ Ponto batido com atraso. Sem bônus.';
        bonus = 0;
    } else {
        message = '❌ Fora do horário comercial. Ponto registrado sem bônus.';
        bonus = 0;
    }

    profile.economy.balance += bonus;
    profile.work.performance.score = Math.min(100, profile.work.performance.score + (bonus > 0 ? 5 : 0));

    // Registrar transação se houver bônus
    if (bonus > 0) {
        profile.economy.transactions.push({
            type: 'bonus',
            amount: bonus,
            description: 'Bônus de pontualidade',
            timestamp: new Date().toISOString()
        });
    }

    await advancedSystem.saveUserProfile(interaction.user.id, interaction.guildId, profile);

    const embed = new EmbedBuilder()
        .setTitle('⏰ Ponto Registrado')
        .setColor(bonus > 0 ? '#00ff00' : '#ff9900')
        .setDescription(message)
        .addFields(
            {
                name: '🕐 Horário',
                value: now.toLocaleTimeString('pt-BR'),
                inline: true
            },
            {
                name: '💰 Bônus',
                value: `$${bonus.toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '⭐ Performance',
                value: `${profile.work.performance.score}/100`,
                inline: true
            }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleEmpregos(interaction, guildConfig) {
    const embed = new EmbedBuilder()
        .setTitle('💼 Empregos Disponíveis')
        .setColor('#0099ff')
        .setDescription('Escolha uma das profissões abaixo:')
        .addFields(
            {
                name: '👮 Policial',
                value: '**Salário:** $150/hora\n**Requisitos:** Força, Tiro\n**Descrição:** Mantém a ordem e segurança da cidade.',
                inline: true
            },
            {
                name: '🏥 Médico',
                value: '**Salário:** $180/hora\n**Requisitos:** Inteligência, Médica\n**Descrição:** Cuida da saúde dos cidadãos.',
                inline: true
            },
            {
                name: '🔧 Mecânico',
                value: '**Salário:** $120/hora\n**Requisitos:** Mecânica, Força\n**Descrição:** Conserta veículos e máquinas.',
                inline: true
            },
            {
                name: '🚗 Motorista',
                value: '**Salário:** $100/hora\n**Requisitos:** Direção, Agilidade\n**Descrição:** Transporta pessoas e cargas.',
                inline: true
            },
            {
                name: '👨‍💼 Empresário',
                value: '**Salário:** $200/hora\n**Requisitos:** Carisma, Inteligência\n**Descrição:** Gerencia negócios e negociações.',
                inline: true
            },
            {
                name: '🌾 Fazendeiro',
                value: '**Salário:** $80/hora\n**Requisitos:** Força, Agilidade\n**Descrição:** Planta e colheita alimentos.',
                inline: true
            },
            {
                name: '🏹 Caçador',
                value: '**Salário:** $90/hora\n**Requisitos:** Tiro, Agilidade\n**Descrição:** Caça animais para obter recursos.',
                inline: true
            },
            {
                name: '⛏️ Minerador',
                value: '**Salário:** $85/hora\n**Requisitos:** Força, Agilidade\n**Descrição:** Extrai minerais valiosos.',
                inline: true
            }
        )
        .setFooter({ text: 'Use /trabalho contratar para escolher uma profissão' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleContratar(interaction, guildConfig) {
    const job = interaction.options.getString('emprego');
    const profile = await advancedSystem.getUserProfile(interaction.user.id, interaction.guildId);

    // Salários por emprego
    const salaries = {
        police: 150,
        medic: 180,
        mechanic: 120,
        driver: 100,
        business: 200,
        farmer: 80,
        hunter: 90,
        miner: 85
    };

    // Atualizar perfil
    profile.work.currentJob = job;
    profile.work.hourlyRate = salaries[job];
    profile.work.position = 'trainee';
    profile.work.performance.score = 0;
    profile.work.performance.bonuses = 0;
    profile.work.performance.promotions = 0;
    profile.work.benefits = {
        mealTicket: false,
        healthPlan: false,
        transportation: false
    };

    await advancedSystem.saveUserProfile(interaction.user.id, interaction.guildId, profile);

    const jobNames = {
        police: 'Policial',
        medic: 'Médico',
        mechanic: 'Mecânico',
        driver: 'Motorista',
        business: 'Empresário',
        farmer: 'Fazendeiro',
        hunter: 'Caçador',
        miner: 'Minerador'
    };

    const embed = new EmbedBuilder()
        .setTitle('🎉 Contratação Realizada!')
        .setColor('#00ff00')
        .setDescription(`Parabéns! Você foi contratado como **${jobNames[job]}**!`)
        .addFields(
            {
                name: '🏢 Cargo',
                value: `${jobNames[job]} - Trainee`,
                inline: true
            },
            {
                name: '💰 Salário/Hora',
                value: `$${salaries[job].toLocaleString('pt-BR')}`,
                inline: true
            },
            {
                name: '📋 Próximos Passos',
                value: 'Use /trabalho pagamento para receber seu salário horário.',
                inline: false
            }
        )
        .setFooter({ text: 'Trabalhe duro para conseguir promoções e benefícios!' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

const { Events, EmbedBuilder } = require('discord.js');
const advancedSystem = require('../data/advancedSystem');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('🚀 Iniciando sistema de eventos automáticos...');
        
        // Iniciar todos os timers
        startHourlyPayments(client);
        startDailyEvents(client);
        startWeeklyTaxes(client);
        startRandomEvents(client);
        startInvestmentUpdates(client);
        
        console.log('✅ Sistema de eventos automáticos iniciado com sucesso!');
    }
};

function startHourlyPayments(client) {
    setInterval(async () => {
        try {
            console.log('⏰ Processando pagamentos horários...');
            
            // Para cada servidor que o bot está
            for (const guild of client.guilds.cache.values()) {
                try {
                    // Buscar todos os usuários com empregos
                    const members = await guild.members.fetch();
                    
                    for (const member of members.values()) {
                        if (member.user.bot) continue;
                        
                        try {
                            const profile = await advancedSystem.getUserProfile(member.id, guild.id);
                            
                            if (profile.work.currentJob) {
                                const payment = await advancedSystem.processHourlyPayment(member.id, guild.id);
                                
                                if (payment && payment.net > 0) {
                                    // Notificar usuário
                                    try {
                                        await member.send({
                                            embeds: [new EmbedBuilder()
                                                .setTitle('💰 Pagamento Automático')
                                                .setColor('#00ff00')
                                                .setDescription(`Seu pagamento horário foi processado!`)
                                                .addFields(
                                                    { name: '💰 Valor Líquido', value: `$${payment.net}`, inline: true },
                                                    { name: '🎁 Bônus', value: `$${payment.bonus}`, inline: true },
                                                    { name: '🧾 Imposto', value: `$${payment.tax}`, inline: true }
                                                )
                                                .setTimestamp()
                                            ]
                                        });
                                    } catch (error) {
                                        console.log(`Não foi possível notificar ${member.user.tag}: ${error.message}`);
                                    }
                                }
                            }
                        } catch (error) {
                            console.log(`Erro ao processar pagamento para ${member.user.tag}: ${error.message}`);
                        }
                    }
                } catch (error) {
                    console.log(`Erro ao processar pagamentos no servidor ${guild.name}: ${error.message}`);
                }
            }
            
            console.log('✅ Pagamentos horários processados com sucesso!');
        } catch (error) {
            console.error('Erro no processamento de pagamentos horários:', error);
        }
    }, 60 * 60 * 1000); // 1 hora
}

function startDailyEvents(client) {
    setInterval(async () => {
        try {
            console.log('📅 Processando eventos diários...');
            
            for (const guild of client.guilds.cache.values()) {
                try {
                    const members = await guild.members.fetch();
                    
                    for (const member of members.values()) {
                        if (member.user.bot) continue;
                        
                        try {
                            const profile = await advancedSystem.getUserProfile(member.id, guild.id);
                            
                            // Reduzir necessidades básicas
                            profile.rp.health.hunger = Math.max(0, profile.rp.health.hunger - 15);
                            profile.rp.health.thirst = Math.max(0, profile.rp.health.thirst - 20);
                            profile.rp.health.sleep = Math.max(0, profile.rp.health.sleep - 10);
                            
                            // Verificar se precisa de atenção médica
                            if (profile.rp.health.hunger === 0 || profile.rp.health.thirst === 0) {
                                profile.rp.health.life = Math.max(0, profile.rp.health.life - 5);
                            }
                            
                            // Processar manutenção diária
                            await advancedSystem.processMaintenance(member.id, guild.id);
                            
                            // Verificar eventos aleatórios
                            const randomEvent = await advancedSystem.processRandomEvent(member.id, guild.id);
                            
                            if (randomEvent) {
                                try {
                                    await member.send({
                                        embeds: [new EmbedBuilder()
                                            .setTitle('🎲 Evento do Dia')
                                            .setColor('#ff9900')
                                            .setDescription(randomEvent)
                                            .setTimestamp()
                                        ]
                                    });
                                } catch (error) {
                                    console.log(`Não foi possível notificar evento para ${member.user.tag}: ${error.message}`);
                                }
                            }
                            
                            // Alertas de necessidades
                            if (profile.rp.health.hunger < 20 || profile.rp.health.thirst < 20) {
                                try {
                                    await member.send({
                                        embeds: [new EmbedBuilder()
                                            .setTitle('⚠️ Alerta de Necessidades')
                                            .setColor('#ff9900')
                                            .setDescription('Você está com fome ou sede! Use o dashboard para se alimentar.')
                                            .addFields(
                                                { name: '🍔 Fome', value: `${profile.rp.health.hunger}%`, inline: true },
                                                { name: '💧 Sede', value: `${profile.rp.health.thirst}%`, inline: true }
                                            )
                                            .setTimestamp()
                                        ]
                                    });
                                } catch (error) {
                                    console.log(`Não foi possível enviar alerta para ${member.user.tag}: ${error.message}`);
                                }
                            }
                            
                            await advancedSystem.saveUserProfile(member.id, guild.id, profile);
                        } catch (error) {
                            console.log(`Erro ao processar eventos diários para ${member.user.tag}: ${error.message}`);
                        }
                    }
                } catch (error) {
                    console.log(`Erro ao processar eventos diários no servidor ${guild.name}: ${error.message}`);
                }
            }
            
            console.log('✅ Eventos diários processados com sucesso!');
        } catch (error) {
            console.error('Erro no processamento de eventos diários:', error);
        }
    }, 24 * 60 * 60 * 1000); // 24 horas
}

function startWeeklyTaxes(client) {
    setInterval(async () => {
        try {
            console.log('💰 Processando impostos semanais...');
            
            for (const guild of client.guilds.cache.values()) {
                try {
                    const members = await guild.members.fetch();
                    
                    for (const member of members.values()) {
                        if (member.user.bot) continue;
                        
                        try {
                            const taxes = await advancedSystem.processMonthlyTaxes(member.id, guild.id);
                            
                            if (taxes.total > 0) {
                                try {
                                    await member.send({
                                        embeds: [new EmbedBuilder()
                                            .setTitle('💰 Impostos Semanais')
                                            .setColor('#ff9900')
                                            .setDescription('Seus impostos semanais foram processados!')
                                            .addFields(
                                                { name: '💰 Total Pago', value: `$${taxes.total}`, inline: true },
                                                { name: '🧾 Imposto de Renda', value: `$${taxes.incomeTax}`, inline: true },
                                                { name: '🚗 IPVA', value: `$${taxes.ipva}`, inline: true },
                                                { name: '🏛️ Taxa Municipal', value: `$${taxes.municipal}`, inline: true }
                                            )
                                            .setTimestamp()
                                        ]
                                    });
                                } catch (error) {
                                    console.log(`Não foi possível notificar impostos para ${member.user.tag}: ${error.message}`);
                                }
                            }
                        } catch (error) {
                            console.log(`Erro ao processar impostos para ${member.user.tag}: ${error.message}`);
                        }
                    }
                } catch (error) {
                    console.log(`Erro ao processar impostos no servidor ${guild.name}: ${error.message}`);
                }
            }
            
            console.log('✅ Impostos semanais processados com sucesso!');
        } catch (error) {
            console.error('Erro no processamento de impostos semanais:', error);
        }
    }, 7 * 24 * 60 * 60 * 1000); // 7 dias
}

function startRandomEvents(client) {
    setInterval(async () => {
        try {
            console.log('🎲 Processando eventos aleatórios...');
            
            for (const guild of client.guilds.cache.values()) {
                try {
                    const members = await guild.members.fetch();
                    
                    // Eventos aleatórios afetam apenas 20% dos usuários online
                    const onlineMembers = members.filter(m => m.presence?.status !== 'offline' && !m.user.bot);
                    const targetMembers = onlineMembers.random(Math.floor(onlineMembers.size * 0.2));
                    
                    for (const member of targetMembers) {
                        try {
                            const randomEvent = await advancedSystem.processRandomEvent(member.id, guild.id);
                            
                            if (randomEvent) {
                                try {
                                    await member.send({
                                        embeds: [new EmbedBuilder()
                                            .setTitle('🎲 Evento Inesperado!')
                                            .setColor('#ff6600')
                                            .setDescription(randomEvent)
                                            .setTimestamp()
                                        ]
                                    });
                                } catch (error) {
                                    console.log(`Não foi possível notificar evento aleatório para ${member.user.tag}: ${error.message}`);
                                }
                            }
                        } catch (error) {
                            console.log(`Erro ao processar evento aleatório para ${member.user.tag}: ${error.message}`);
                        }
                    }
                } catch (error) {
                    console.log(`Erro ao processar eventos aleatórios no servidor ${guild.name}: ${error.message}`);
                }
            }
            
            console.log('✅ Eventos aleatórios processados com sucesso!');
        } catch (error) {
            console.error('Erro no processamento de eventos aleatórios:', error);
        }
    }, 2 * 60 * 60 * 1000); // 2 horas
}

function startInvestmentUpdates(client) {
    setInterval(async () => {
        try {
            console.log('📈 Atualizando investimentos...');
            
            for (const guild of client.guilds.cache.values()) {
                try {
                    const members = await guild.members.fetch();
                    
                    for (const member of members.values()) {
                        if (member.user.bot) continue;
                        
                        try {
                            const profile = await advancedSystem.getUserProfile(member.id, guild.id);
                            
                            if (profile.economy.bank.investments.length > 0) {
                                let totalReturns = 0;
                                
                                for (const investment of profile.economy.bank.investments) {
                                    // Calcular retornos baseados no tipo e risco
                                    const returnRates = {
                                        stocks: { min: -0.15, max: 0.25 }, // -15% a +25%
                                        bonds: { min: 0.02, max: 0.08 },    // 2% a 8%
                                        crypto: { min: -0.40, max: 0.60 }  // -40% a +60%
                                    };
                                    
                                    const rates = returnRates[investment.type];
                                    const returnRate = Math.random() * (rates.max - rates.min) + rates.min;
                                    const returns = Math.floor(investment.amount * returnRate);
                                    
                                    investment.amount += returns;
                                    investment.returns += returns;
                                    investment.lastUpdate = new Date().toISOString();
                                    
                                    totalReturns += returns;
                                }
                                
                                // Notificar se houver retornos significativos
                                if (Math.abs(totalReturns) > 100) {
                                    try {
                                        await member.send({
                                            embeds: [new EmbedBuilder()
                                                .setTitle('📈 Atualização de Investimentos')
                                                .setColor(totalReturns > 0 ? '#00ff00' : '#ff0000')
                                                .setDescription(`Seus investimentos tiveram uma ${totalReturns > 0 ? 'alta' : 'baixa'}!`)
                                                .addFields(
                                                    { name: '💰 Retorno Total', value: `${totalReturns > 0 ? '+' : ''}$${totalReturns}`, inline: true }
                                                )
                                                .setTimestamp()
                                            ]
                                        });
                                    } catch (error) {
                                        console.log(`Não foi possível notificar investimento para ${member.user.tag}: ${error.message}`);
                                    }
                                }
                                
                                await advancedSystem.saveUserProfile(member.id, guild.id, profile);
                            }
                        } catch (error) {
                            console.log(`Erro ao atualizar investimentos para ${member.user.tag}: ${error.message}`);
                        }
                    }
                } catch (error) {
                    console.log(`Erro ao atualizar investimentos no servidor ${guild.name}: ${error.message}`);
                }
            }
            
            console.log('✅ Investimentos atualizados com sucesso!');
        } catch (error) {
            console.error('Erro na atualização de investimentos:', error);
        }
    }, 6 * 60 * 60 * 1000); // 6 horas
}

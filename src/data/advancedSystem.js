/**
 * SISTEMA AVANÇADO DE RP E ECONOMIA
 * Database otimizada e sistemas integrados
 */

const fs = require('fs');
const path = require('path');

class AdvancedSystem {
    constructor() {
        this.dataPath = path.join(__dirname, '..', 'data');
        this.ensureDirectories();
        this.loadAllData();
    }

    ensureDirectories() {
        const dirs = ['users', 'companies', 'market', 'legal', 'events'];
        dirs.forEach(dir => {
            const dirPath = path.join(this.dataPath, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });
    }

    // Estrutura otimizada de database
    createDefaultProfile(userId, guildId) {
        return {
            id: userId,
            guildId: guildId,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            
            // ECONOMIA
            economy: {
                balance: 1000, // Saldo inicial
                bank: {
                    checking: 500,
                    savings: 0,
                    investments: []
                },
                cards: {
                    debit: { enabled: true, limit: 1000 },
                    credit: { enabled: false, limit: 0, debt: 0 }
                },
                transactions: [],
                taxes: {
                    incomeTax: 0,
                    ipva: {},
                    municipal: 0,
                    lastPaid: new Date().toISOString()
                }
            },

            // RP
            rp: {
                health: {
                    life: 100,
                    hunger: 100,
                    thirst: 100,
                    sleep: 100
                },
                skills: {
                    strength: { level: 1, xp: 0 },
                    intelligence: { level: 1, xp: 0 },
                    agility: { level: 1, xp: 0 },
                    charisma: { level: 1, xp: 0 },
                    driving: { level: 1, xp: 0 },
                    shooting: { level: 1, xp: 0 },
                    medical: { level: 1, xp: 0 },
                    mechanics: { level: 1, xp: 0 }
                },
                inventory: {
                    items: [],
                    maxWeight: 50,
                    currentWeight: 0
                },
                vehicles: [],
                documents: {
                    cnh: null,
                    rg: null,
                    passport: null,
                    licenses: {}
                }
            },

            // TRABALHO
            work: {
                currentJob: null,
                company: null,
                position: 'trainee',
                salary: 0,
                hourlyRate: 50,
                performance: {
                    score: 0,
                    bonuses: 0,
                    promotions: 0
                },
                benefits: {
                    mealTicket: false,
                    healthPlan: false,
                    transportation: false
                },
                workHistory: [],
                lastPaycheck: new Date().toISOString()
            },

            // LEGAL
            legal: {
                criminalRecord: [],
                activeWarrants: [],
                fines: [],
                licenses: {
                    driver: { valid: true, points: 0 },
                    weapon: { valid: false },
                    business: { valid: false }
                },
                cases: []
            }
        };
    }

    // SISTEMA DE TRABALHO REALISTA
    async processHourlyPayment(userId, guildId) {
        const profile = await this.getUserProfile(userId, guildId);
        if (!profile.work.currentJob) return null;

        const hourlyRate = profile.work.hourlyRate;
        const performanceBonus = Math.floor(profile.work.performance.score * 0.1 * hourlyRate);
        const totalPayment = hourlyRate + performanceBonus;

        // Desconto de imposto de renda (15%)
        const incomeTax = Math.floor(totalPayment * 0.15);
        const netPayment = totalPayment - incomeTax;

        // Atualizar saldo
        profile.economy.balance += netPayment;
        profile.economy.taxes.incomeTax += incomeTax;

        // Registrar transação
        profile.economy.transactions.push({
            type: 'salary',
            amount: netPayment,
            description: `Salário horário + bônus`,
            timestamp: new Date().toISOString(),
            details: {
                gross: totalPayment,
                tax: incomeTax,
                bonus: performanceBonus
            }
        });

        // XP em habilidades relacionadas ao trabalho
        await this.addWorkSkillXP(profile, 10);

        await this.saveUserProfile(userId, guildId, profile);
        
        return {
            gross: totalPayment,
            net: netPayment,
            tax: incomeTax,
            bonus: performanceBonus
        };
    }

    async addWorkSkillXP(profile, amount) {
        const jobSkills = this.getJobSkills(profile.work.currentJob);
        for (const skill of jobSkills) {
            if (profile.rp.skills[skill]) {
                profile.rp.skills[skill].xp += amount;
                
                // Verificar level up
                const xpNeeded = profile.rp.skills[skill].level * 100;
                if (profile.rp.skills[skill].xp >= xpNeeded) {
                    profile.rp.skills[skill].xp -= xpNeeded;
                    profile.rp.skills[skill].level++;
                    
                    // Bônus de promoção
                    if (profile.rp.skills[skill].level % 5 === 0) {
                        await this.processPromotion(profile);
                    }
                }
            }
        }
    }

    getJobSkills(job) {
        const jobSkills = {
            'police': ['strength', 'shooting', 'intelligence'],
            'medic': ['medical', 'intelligence'],
            'mechanic': ['mechanics', 'strength'],
            'driver': ['driving', 'agility'],
            'business': ['charisma', 'intelligence'],
            'farmer': ['strength', 'agility'],
            'hunter': ['shooting', 'agility'],
            'miner': ['strength', 'agility']
        };
        return jobSkills[job] || ['strength'];
    }

    async processPromotion(profile) {
        profile.work.performance.promotions++;
        profile.work.hourlyRate = Math.floor(profile.work.hourlyRate * 1.1); // 10% de aumento
        
        // Desbloquear benefícios
        if (profile.work.performance.promotions >= 3) {
            profile.work.benefits.mealTicket = true;
        }
        if (profile.work.performance.promotions >= 5) {
            profile.work.benefits.healthPlan = true;
        }
        if (profile.work.performance.promotions >= 10) {
            profile.work.benefits.transportation = true;
        }

        // Atualizar posição
        const positions = ['trainee', 'junior', 'mid', 'senior', 'specialist', 'manager', 'director'];
        const currentIndex = positions.indexOf(profile.work.position);
        if (currentIndex < positions.length - 1) {
            profile.work.position = positions[currentIndex + 1];
        }
    }

    // SISTEMA DE IMPOSTOS E TAXAS
    async processMonthlyTaxes(userId, guildId) {
        const profile = await this.getUserProfile(userId, guildId);
        const taxes = {
            incomeTax: 0,
            ipva: 0,
            municipal: 0,
            total: 0
        };

        // Imposto de renda (se não foi pago)
        if (profile.economy.taxes.incomeTax > 0) {
            taxes.incomeTax = profile.economy.taxes.incomeTax;
            profile.economy.balance -= taxes.incomeTax;
            profile.economy.taxes.incomeTax = 0;
        }

        // IPVA para veículos
        for (const vehicle of profile.rp.vehicles) {
            const ipvaAmount = Math.floor(vehicle.value * 0.025); // 2.5% do valor
            taxes.ipva += ipvaAmount;
            profile.economy.taxes.ipva[vehicle.id] = {
                amount: ipvaAmount,
                paid: true,
                timestamp: new Date().toISOString()
            };
        }

        // Taxa municipal (fixa)
        taxes.municipal = 100;
        taxes.total = taxes.incomeTax + taxes.ipva + taxes.municipal;

        if (taxes.total > 0) {
            profile.economy.balance -= taxes.total;
            profile.economy.taxes.lastPaid = new Date().toISOString();
            
            profile.economy.transactions.push({
                type: 'tax',
                amount: -taxes.total,
                description: 'Pagamento de impostos mensais',
                timestamp: new Date().toISOString(),
                details: taxes
            });
        }

        await this.saveUserProfile(userId, guildId, profile);
        return taxes;
    }

    async processFine(userId, guildId, fineData) {
        const profile = await this.getUserProfile(userId, guildId);
        
        const fine = {
            id: Date.now().toString(),
            type: fineData.type,
            amount: fineData.amount,
            reason: fineData.reason,
            issuedBy: fineData.issuedBy,
            timestamp: new Date().toISOString(),
            paid: false,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias
        };

        profile.legal.fines.push(fine);
        
        // Adicionar pontos na carteira se for trânsito
        if (fineData.type === 'traffic') {
            profile.legal.licenses.driver.points += fineData.points || 0;
            
            // Suspender carteira se atingir 20 pontos
            if (profile.legal.licenses.driver.points >= 20) {
                profile.legal.licenses.driver.valid = false;
            }
        }

        await this.saveUserProfile(userId, guildId, profile);
        return fine;
    }

    // SISTEMA DE EVENTOS AUTOMÁTICOS
    async processRandomEvent(userId, guildId) {
        const events = [
            {
                name: 'oportunidade_negocio',
                probability: 0.05,
                effect: async (profile) => {
                    const amount = Math.floor(Math.random() * 500) + 100;
                    profile.economy.balance += amount;
                    return `Você encontrou uma oportunidade de negócio e ganhou $${amount}!`;
                }
            },
            {
                name: 'roubo',
                probability: 0.03,
                effect: async (profile) => {
                    const amount = Math.floor(profile.economy.balance * 0.1);
                    profile.economy.balance -= amount;
                    return `Você foi roubado e perdeu $${amount}!`;
                }
            },
            {
                name: 'acidente_veiculo',
                probability: 0.02,
                effect: async (profile) => {
                    if (profile.rp.vehicles.length > 0) {
                        const vehicle = profile.rp.vehicles[0];
                        const repairCost = Math.floor(vehicle.value * 0.15);
                        profile.economy.balance -= repairCost;
                        return `Seu veículo ${vehicle.model} teve um acidente. Custo do reparo: $${repairCost}`;
                    }
                    return null;
                }
            },
            {
                name: 'bonus_desempenho',
                probability: 0.08,
                effect: async (profile) => {
                    if (profile.work.currentJob) {
                        const bonus = Math.floor(profile.work.hourlyRate * 2);
                        profile.economy.balance += bonus;
                        profile.work.performance.bonuses++;
                        return `Bônus de desempenho no trabalho: $${bonus}!`;
                    }
                    return null;
                }
            }
        ];

        const random = Math.random();
        let cumulativeProbability = 0;

        for (const event of events) {
            cumulativeProbability += event.probability;
            if (random < cumulativeProbability) {
                const profile = await this.getUserProfile(userId, guildId);
                const result = await event.effect(profile);
                await this.saveUserProfile(userId, guildId, profile);
                return result;
            }
        }

        return null;
    }

    async processMaintenance(userId, guildId) {
        const profile = await this.getUserProfile(userId, guildId);
        let totalCost = 0;

        // Manutenção de veículos
        for (const vehicle of profile.rp.vehicles) {
            const maintenanceCost = Math.floor(vehicle.value * 0.01);
            totalCost += maintenanceCost;
            vehicle.maintenance = (vehicle.maintenance || 100) - 5;
        }

        // Degradação de itens
        for (const item of profile.rp.inventory.items) {
            if (item.durability !== undefined) {
                item.durability = Math.max(0, item.durability - 1);
                if (item.durability === 0) {
                    // Remover item quebrado
                    const index = profile.rp.inventory.items.indexOf(item);
                    profile.rp.inventory.items.splice(index, 1);
                }
            }
        }

        if (totalCost > 0) {
            profile.economy.balance -= totalCost;
            profile.economy.transactions.push({
                type: 'maintenance',
                amount: -totalCost,
                description: 'Manutenção automática',
                timestamp: new Date().toISOString()
            });
        }

        await this.saveUserProfile(userId, guildId, profile);
        return totalCost;
    }

    // SISTEMA BANCÁRIO AVANÇADO
    async createAccount(userId, guildId, accountType) {
        const profile = await this.getUserProfile(userId, guildId);
        
        if (accountType === 'savings') {
            profile.economy.bank.savings = 0;
        } else if (accountType === 'investment') {
            profile.economy.bank.investments.push({
                type: 'stocks',
                amount: 0,
                risk: 'medium',
                returns: 0,
                createdAt: new Date().toISOString()
            });
        }

        await this.saveUserProfile(userId, guildId, profile);
        return true;
    }

    async processTransfer(userId, guildId, targetId, amount, type = 'pix') {
        const profile = await this.getUserProfile(userId, guildId);
        const targetProfile = await this.getUserProfile(targetId, guildId);

        if (profile.economy.balance < amount) {
            throw new Error('Saldo insuficiente');
        }

        // Taxas de transferência
        let fee = 0;
        if (type === 'ted') fee = Math.floor(amount * 0.01);
        if (type === 'doc') fee = Math.floor(amount * 0.02);

        const totalAmount = amount + fee;

        if (profile.economy.balance < totalAmount) {
            throw new Error('Saldo insuficiente para cobrir taxas');
        }

        // Processar transferência
        profile.economy.balance -= totalAmount;
        targetProfile.economy.balance += amount;

        // Registrar transações
        const transaction = {
            type: 'transfer',
            amount: -amount,
            fee: fee,
            description: `Transferência para ${targetId}`,
            timestamp: new Date().toISOString(),
            target: targetId
        };

        profile.economy.transactions.push(transaction);
        targetProfile.economy.transactions.push({
            ...transaction,
            amount: amount,
            fee: 0,
            description: `Transferência recebida de ${userId}`,
            target: userId
        });

        await this.saveUserProfile(userId, guildId, profile);
        await this.saveUserProfile(targetId, guildId, targetProfile);

        return { amount, fee, total: totalAmount };
    }

    // Funções auxiliares
    async getUserProfile(userId, guildId) {
        const filePath = path.join(this.dataPath, 'users', `${guildId}_${userId}.json`);
        
        if (!fs.existsSync(filePath)) {
            const defaultProfile = this.createDefaultProfile(userId, guildId);
            await this.saveUserProfile(userId, guildId, defaultProfile);
            return defaultProfile;
        }

        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    async saveUserProfile(userId, guildId, profile) {
        const filePath = path.join(this.dataPath, 'users', `${guildId}_${userId}.json`);
        profile.lastUpdated = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
    }

    async loadAllData() {
        // Carregar dados iniciais se necessário
        console.log('Sistema avançado de RP e Economia inicializado');
    }
}

module.exports = new AdvancedSystem();

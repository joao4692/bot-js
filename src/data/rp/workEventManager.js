const { getRpProfile, saveRpProfile } = require('./rpManager');
const { getUser, saveUser, addTransaction } = require('../economy/economyManager');

/**
 * Sistema de Eventos Aleatórios de Trabalho
 */

const WORK_EVENTS = {
    // Eventos positivos
    positive: [
        {
            name: "Cliente Generoso",
            description: "Um cliente ficou muito satisfeito com seu trabalho e deu uma gorjeta extra!",
            chance: 0.1,
            reward: { type: "money", min: 100, max: 500 },
            icon: "💎"
        },
        {
            name: "Bônus de Produtividade",
            description: "Você estava tão produtivo hoje que seu chefe deu um bônus especial!",
            chance: 0.08,
            reward: { type: "multiplier", value: 1.5 },
            icon: "🚀"
        },
        {
            name: "Oportunidade Extra",
            description: "Uma oportunidade inesperada rendeu um trabalho extra bem pago!",
            chance: 0.12,
            reward: { type: "money", min: 200, max: 800 },
            icon: "🌟"
        },
        {
            name: "Reconhecimento",
            description: "Seu excelente trabalho foi reconhecido pela equipe!",
            chance: 0.15,
            reward: { type: "experience", value: 50 },
            icon: "🏆"
        },
        {
            name: "Dia de Sorte",
            description: "Hoje é seu dia de sorte! As coisas estão dando certo para você.",
            chance: 0.05,
            reward: { type: "money", min: 500, max: 1500 },
            icon: "🍀"
        }
    ],
    
    // Eventos neutros
    neutral: [
        {
            name: "Dia Normal",
            description: "Um dia de trabalho comum, sem surpresas.",
            chance: 0.4,
            icon: "📋"
        },
        {
            name: "Conversa Interessante",
            description: "Você teve uma conversa interessante com um colega de trabalho.",
            chance: 0.15,
            reward: { type: "experience", value: 10 },
            icon: "💬"
        },
        {
            name: "Aprendizado",
            description: "Você aprendeu algo novo hoje no trabalho.",
            chance: 0.2,
            reward: { type: "experience", value: 25 },
            icon: "📚"
        }
    ],
    
    // Eventos negativos (leves)
    negative: [
        {
            name: "Pequeno Imprevisto",
            description: "Um pequeno imprevisto atrasou seu trabalho, mas você conseguiu resolver.",
            chance: 0.1,
            penalty: { type: "multiplier", value: 0.9 },
            icon: "⚠️"
        },
        {
            name: "Dia Cansativo",
            description: "Hoje foi um dia especialmente cansativo.",
            chance: 0.08,
            penalty: { type: "multiplier", value: 0.85 },
            icon: "😴"
        },
        {
            name: "Material Acabou",
            description: "O material de trabalho acabou e você precisou improvisar.",
            chance: 0.05,
            penalty: { type: "multiplier", value: 0.8 },
            icon: "🔧"
        }
    ]
};

// Eventos específicos por profissão
const JOB_SPECIFIC_EVENTS = {
    police_officer: [
        {
            name: "Operação Bem-Sucedida",
            description: "Você participou de uma operação policial bem-sucedida!",
            chance: 0.15,
            reward: { type: "money", min: 300, max: 1000 },
            icon: "🚔"
        },
        {
            name: "Resgate Importante",
            description: "Você ajudou a resgatar alguém em situação de perigo!",
            chance: 0.1,
            reward: { type: "experience", value: 100 },
            icon: "🆘"
        }
    ],
    
    surgeon: [
        {
            name: "Cirurgia Complexa",
            description: "Você realizou uma cirurgia complexa com sucesso!",
            chance: 0.12,
            reward: { type: "money", min: 500, max: 2000 },
            icon: "⚕️"
        },
        {
            name: "Descoberta Médica",
            description: "Você fez uma descoberta importante durante seu trabalho!",
            chance: 0.05,
            reward: { type: "experience", value: 150 },
            icon: "🔬"
        }
    ],
    
    trucker: [
        {
            name: "Carga Valiosa",
            description: "Você transportou uma carga especialmente valiosa!",
            chance: 0.15,
            reward: { type: "money", min: 400, max: 1200 },
            icon: "🚚"
        },
        {
            name: "Rota Bonificada",
            description: "Sua rota teve uma bonificação especial por eficiência!",
            chance: 0.1,
            reward: { type: "multiplier", value: 1.3 },
            icon: "🗺️"
        }
    ],
    
    agent: [
        {
            name: "Fiscalização Premiada",
            description: "Sua fiscalização rendeu multas importantes para o Detran!",
            chance: 0.12,
            reward: { type: "money", min: 250, max: 800 },
            icon: "🚗"
        },
        {
            name: "Operação Especial",
            description: "Você participou de uma operação especial de trânsito!",
            chance: 0.08,
            reward: { type: "experience", value: 80 },
            icon: "🚦"
        }
    ]
};

/**
 * Gerar evento aleatório de trabalho
 */
async function generateWorkEvent(guildId, userId, jobId, baseSalary, guildConfig) {
    const random = Math.random();
    let eventType;
    let event;
    
    // Determinar tipo de evento baseado na chance
    if (random < 0.25) { // 25% chance de evento positivo
        eventType = 'positive';
    } else if (random < 0.75) { // 50% chance de evento neutro
        eventType = 'neutral';
    } else { // 25% chance de evento negativo
        eventType = 'negative';
    }
    
    // Verificar eventos específicos da profissão primeiro
    const jobEvents = JOB_SPECIFIC_EVENTS[jobId];
    if (jobEvents && Math.random() < 0.3) { // 30% chance de evento específico
        const jobEvent = jobEvents[Math.floor(Math.random() * jobEvents.length)];
        if (Math.random() < jobEvent.chance) {
            event = { ...jobEvent, type: 'job_specific' };
        }
    }
    
    // Se não houver evento específico, escolher evento geral
    if (!event) {
        const events = WORK_EVENTS[eventType];
        const availableEvents = events.filter(e => Math.random() < e.chance);
        
        if (availableEvents.length === 0) {
            // Evento padrão se nenhum for selecionado
            event = WORK_EVENTS.neutral[0];
        } else {
            event = availableEvents[Math.floor(Math.random() * availableEvents.length)];
        }
    }
    
    // Processar o evento
    return await processEvent(guildId, userId, event, baseSalary, guildConfig);
}

/**
 * Processar os efeitos de um evento
 */
async function processEvent(guildId, userId, event, baseSalary, guildConfig) {
    const rpProfile = await getRpProfile(guildId, userId);
    const economyProfile = await getUser(userId, guildId, guildConfig);
    const currency = guildConfig.economy?.currency || '💰';
    
    let result = {
        event: event,
        rewards: [],
        penalties: [],
        message: `${event.icon} **${event.name}**: ${event.description}`
    };
    
    // Processar recompensas
    if (event.reward) {
        switch (event.reward.type) {
            case "money":
                const amount = Math.floor(Math.random() * (event.reward.max - event.reward.min + 1)) + event.reward.min;
                economyProfile.wallet = (economyProfile.wallet || 0) + amount;
                result.rewards.push(`${currency} ${amount.toLocaleString('pt-BR')}`);
                result.bonusMoney = amount;
                break;
                
            case "multiplier":
                result.salaryMultiplier = event.reward.value;
                result.rewards.push(`+${Math.round((event.reward.value - 1) * 100)}% salário`);
                break;
                
            case "experience":
                rpProfile.workExperience = (rpProfile.workExperience || 0) + event.reward.value;
                result.rewards.push(`+${event.reward.value} XP`);
                result.bonusExperience = event.reward.value;
                break;
        }
    }
    
    // Processar penalidades
    if (event.penalty) {
        switch (event.penalty.type) {
            case "money":
                const amount = Math.floor(Math.random() * (event.penalty.max - event.penalty.min + 1)) + event.penalty.min;
                economyProfile.wallet = Math.max(0, (economyProfile.wallet || 0) - amount);
                result.penalties.push(`${currency} ${amount.toLocaleString('pt-BR')}`);
                result.penaltyMoney = amount;
                break;
                
            case "multiplier":
                result.salaryMultiplier = event.penalty.value;
                result.penalties.push(`-${Math.round((1 - event.penalty.value) * 100)}% salário`);
                break;
        }
    }
    
    // Salvar alterações se houver
    if (result.rewards.length > 0 || result.penalties.length > 0) {
        await saveRpProfile(guildId, userId, rpProfile);
        await saveUser(userId, guildId, guildConfig, economyProfile);
    }
    
    return result;
}

/**
 * Formatar mensagem de evento para embed
 */
function formatEventMessage(eventResult) {
    let message = eventResult.message;
    
    if (eventResult.rewards.length > 0) {
        message += `\n\n🎁 **Recompensas**: ${eventResult.rewards.join(', ')}`;
    }
    
    if (eventResult.penalties.length > 0) {
        message += `\n\n⚠️ **Penalidades**: ${eventResult.penalties.join(', ')}`;
    }
    
    return message;
}

module.exports = {
    generateWorkEvent,
    processEvent,
    formatEventMessage,
    WORK_EVENTS,
    JOB_SPECIFIC_EVENTS
};

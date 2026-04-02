const { getRpProfile, saveRpProfile } = require('./rpManager');
const { getUser, saveUser, addTransaction } = require('../economy/economyManager');

/**
 * Sistema de Bônus e Conquistas Profissionais
 */

const BONUS_THRESHOLDS = {
    // Dias consecutivos trabalhando
    consecutive_days: {
        3: { multiplier: 1.1, bonus: '🔥 Foco', description: '+10% bônus por 3 dias consecutivos' },
        7: { multiplier: 1.25, bonus: '💪 Dedicação', description: '+25% bônus por 7 dias consecutivos' },
        14: { multiplier: 1.5, bonus: '⭐ Mestre', description: '+50% bônus por 14 dias consecutivos' },
        30: { multiplier: 2.0, bonus: '👑 Lenda', description: '+100% bônus por 30 dias consecutivos' }
    },
    // Total de trabalhos realizados
    total_works: {
        10: { bonus: '🎯 Iniciante', reward: 500 },
        50: { bonus: '💼 Experiente', reward: 2000 },
        100: { bonus: '🏆 Profissional', reward: 5000 },
        500: { bonus: '💎 Mestre', reward: 15000 },
        1000: { bonus: '👑 Lenda', reward: 50000 }
    },
    // Experiência profissional
    experience_levels: {
        100: { level: 'Júnior', bonus: 50 },
        500: { level: 'Pleno', bonus: 200 },
        1000: { level: 'Sênior', bonus: 500 },
        5000: { level: 'Especialista', bonus: 2000 },
        10000: { level: 'Mestre', bonus: 5000 }
    }
};

/**
 * Calcular bônus de assiduidade
 */
async function calculateAttendanceBonus(guildId, userId) {
    const rpProfile = await getRpProfile(guildId, userId);
    
    if (!rpProfile.workHistory || rpProfile.workHistory.length === 0) {
        return { multiplier: 1, bonus: null, description: null };
    }

    // Verificar dias consecutivos
    const consecutiveDays = await getConsecutiveWorkDays(rpProfile.workHistory);
    const consecutiveBonus = BONUS_THRESHOLDS.consecutive_days[consecutiveDays];
    
    if (consecutiveBonus) {
        return {
            multiplier: consecutiveBonus.multiplier,
            bonus: consecutiveBonus.bonus,
            description: consecutiveBonus.description
        };
    }

    return { multiplier: 1, bonus: null, description: null };
}

/**
 * Verificar conquistas por total de trabalhos
 */
async function checkWorkCountAchievements(guildId, userId, guildConfig) {
    const rpProfile = await getRpProfile(guildId, userId);
    const totalWorks = rpProfile.workHistory ? rpProfile.workHistory.length : 0;
    
    const achievements = [];
    
    for (const [threshold, achievement] of Object.entries(BONUS_THRESHOLDS.total_works)) {
        if (totalWorks >= parseInt(threshold)) {
            const achievementKey = `work_count_${threshold}`;
            
            if (!rpProfile.achievements?.includes(achievementKey)) {
                // Adicionar conquista
                rpProfile.achievements = rpProfile.achievements || [];
                rpProfile.achievements.push(achievementKey);
                
                // Dar recompensa
                const economyProfile = await getUser(userId, guildId, guildConfig);
                economyProfile.wallet = (economyProfile.wallet || 0) + achievement.reward;
                
                await saveUser(userId, guildId, guildConfig, economyProfile);
                await addTransaction(userId, guildId, guildConfig, 'achievement', achievement.reward, `Conquista: ${achievement.bonus}`);
                
                achievements.push({
                    ...achievement,
                    threshold: parseInt(threshold),
                    current: totalWorks
                });
            }
        }
    }
    
    if (achievements.length > 0) {
        await saveRpProfile(guildId, userId, rpProfile);
    }
    
    return achievements;
}

/**
 * Verificar nível de experiência
 */
async function checkExperienceLevel(guildId, userId) {
    const rpProfile = await getRpProfile(guildId, userId);
    const experience = rpProfile.workExperience || 0;
    
    let currentLevel = null;
    let nextLevel = null;
    
    const levels = Object.entries(BONUS_THRESHOLDS.experience_levels)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    
    for (const [threshold, level] of levels) {
        if (experience >= parseInt(threshold)) {
            currentLevel = { ...level, threshold: parseInt(threshold) };
        } else {
            nextLevel = { ...level, threshold: parseInt(threshold), remaining: parseInt(threshold) - experience };
            break;
        }
    }
    
    return { currentLevel, nextLevel };
}

/**
 * Calcular dias consecutivos de trabalho
 */
async function getConsecutiveWorkDays(workHistory) {
    if (!workHistory || workHistory.length === 0) return 0;
    
    // Ordenar por data (mais recente primeiro)
    const sortedHistory = [...workHistory].sort((a, b) => b.date - a.date);
    
    let consecutiveDays = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Verificar se trabalhou hoje
    const lastWork = new Date(sortedHistory[0].date);
    lastWork.setHours(0, 0, 0, 0);
    
    if (lastWork.getTime() !== today.getTime()) {
        // Verificar se foi ontem
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastWork.getTime() !== yesterday.getTime()) {
            return 0; // Quebrou a sequência
        }
    }
    
    // Contar dias consecutivos
    for (let i = 1; i < sortedHistory.length; i++) {
        const currentWork = new Date(sortedHistory[i].date);
        const previousWork = new Date(sortedHistory[i-1].date);
        
        currentWork.setHours(0, 0, 0, 0);
        previousWork.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((previousWork - currentWork) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
            consecutiveDays++;
        } else {
            break;
        }
    }
    
    return consecutiveDays;
}

/**
 * Calcular bônus de desempenho baseado em histórico
 */
async function calculatePerformanceBonus(guildId, userId) {
    const rpProfile = await getRpProfile(guildId, userId);
    
    if (!rpProfile.workHistory || rpProfile.workHistory.length < 5) {
        return { multiplier: 1, bonus: null };
    }
    
    // Calcular média salarial recente
    const recentWorks = rpProfile.workHistory.slice(-10);
    const avgSalary = recentWorks.reduce((sum, work) => sum + work.salary, 0) / recentWorks.length;
    
    // Bônus por consistência
    if (avgSalary > 1000) {
        return { multiplier: 1.1, bonus: '💰 Desempenho Excelente' };
    } else if (avgSalary > 500) {
        return { multiplier: 1.05, bonus: '📈 Bom Desempenho' };
    }
    
    return { multiplier: 1, bonus: null };
}

/**
 * Processar todos os bônus disponíveis
 */
async function processAllBonuses(guildId, userId, baseSalary, guildConfig) {
    const [attendanceBonus, performanceBonus, achievements] = await Promise.all([
        calculateAttendanceBonus(guildId, userId),
        calculatePerformanceBonus(guildId, userId),
        checkWorkCountAchievements(guildId, userId, guildConfig)
    ]);
    
    const experienceLevel = await checkExperienceLevel(guildId, userId);
    
    // Calcular multiplicador total
    let totalMultiplier = attendanceBonus.multiplier * performanceBonus.multiplier;
    let finalSalary = Math.round(baseSalary * totalMultiplier);
    
    // Adicionar bônus de nível se aplicável
    if (experienceLevel.currentLevel) {
        finalSalary += experienceLevel.currentLevel.bonus;
    }
    
    return {
        originalSalary: baseSalary,
        finalSalary,
        totalMultiplier,
        bonuses: {
            attendance: attendanceBonus,
            performance: performanceBonus,
            experience: experienceLevel.currentLevel
        },
        achievements,
        nextLevel: experienceLevel.nextLevel
    };
}

/**
 * Gerar mensagem de bônus para embed
 */
function generateBonusMessage(bonusData, currency) {
    const messages = [];
    
    if (bonusData.bonuses.attendance.bonus) {
        messages.push(`🔥 **${bonusData.bonuses.attendance.bonus}**: ${bonusData.bonuses.attendance.description}`);
    }
    
    if (bonusData.bonuses.performance.bonus) {
        messages.push(`📈 **${bonusData.bonuses.performance.bonus}**: +${Math.round((bonusData.bonuses.performance.multiplier - 1) * 100)}% salário`);
    }
    
    if (bonusData.bonuses.experience) {
        messages.push(`⭐ **Nível ${bonusData.bonuses.experience.level}**: +${currency} ${bonusData.bonuses.experience.bonus}`);
    }
    
    if (bonusData.achievements.length > 0) {
        messages.push(`🏆 **Nova Conquista**: ${bonusData.achievements[0].bonus} (+${currency} ${bonusData.achievements[0].reward.toLocaleString('pt-BR')})`);
    }
    
    return messages.length > 0 ? messages.join('\n') : null;
}

module.exports = {
    calculateAttendanceBonus,
    checkWorkCountAchievements,
    checkExperienceLevel,
    calculatePerformanceBonus,
    processAllBonuses,
    generateBonusMessage,
    BONUS_THRESHOLDS
};

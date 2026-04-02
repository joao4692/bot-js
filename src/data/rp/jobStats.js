const path = require('path');
const db = require('../../utils/database');

const statsPath = path.join(__dirname, '../../data/rp/job_stats.json');

/**
 * Sistema de estatísticas de empregos
 * Rastreia ganhos, experiência e uso de cada emprego
 */

/**
 * Obter estatísticas de um usuário
 */
async function getUserJobStats(guildId, userId) {
  const stats = await db.read(statsPath, {});
  const key = `${guildId}_${userId}`;

  if (!stats[key]) {
    stats[key] = {
      totalEarned: 0,
      totalWorkSessions: 0,
      jobHistory: [],
      currentStreak: 0,
      longestStreak: 0,
      favoriteJob: null
    };
    await db.write(statsPath, stats);
  }

  return stats[key];
}

/**
 * Atualizar estatísticas após trabalhar
 */
async function updateJobStats(guildId, userId, jobId, salary) {
  const stats = await db.read(statsPath, {});
  const key = `${guildId}_${userId}`;

  if (!stats[key]) {
    stats[key] = {
      totalEarned: 0,
      totalWorkSessions: 0,
      jobHistory: [],
      currentStreak: 0,
      longestStreak: 0,
      favoriteJob: null
    };
  }

  const userStats = stats[key];
  userStats.totalEarned = (userStats.totalEarned || 0) + salary;
  userStats.totalWorkSessions = (userStats.totalWorkSessions || 0) + 1;
  userStats.currentStreak = (userStats.currentStreak || 0) + 1;

  if (userStats.currentStreak > userStats.longestStreak) {
    userStats.longestStreak = userStats.currentStreak;
  }

  // Adicionar ao histórico de empregos
  if (!userStats.jobHistory) userStats.jobHistory = [];

  const historyEntry = userStats.jobHistory.find(j => j.jobId === jobId);
  if (historyEntry) {
    historyEntry.times += 1;
    historyEntry.totalEarned += salary;
    historyEntry.lastWorked = Date.now();
  } else {
    userStats.jobHistory.push({
      jobId,
      times: 1,
      totalEarned: salary,
      firstWorked: Date.now(),
      lastWorked: Date.now()
    });
  }

  // Atualizar emprego favorito
  if (userStats.jobHistory.length > 0) {
    userStats.favoriteJob = userStats.jobHistory.reduce((a, b) => 
      a.times > b.times ? a : b
    ).jobId;
  }

  stats[key] = userStats;
  await db.write(statsPath, stats);

  return userStats;
}

/**
 * Resetar streak (chamado quando o usuário não trabalha por muito tempo)
 */
async function resetStreak(guildId, userId) {
  const stats = await db.read(statsPath, {});
  const key = `${guildId}_${userId}`;

  if (stats[key]) {
    stats[key].currentStreak = 0;
    await db.write(statsPath, stats);
  }
}

/**
 * Obter ranking de usuários por ganhos
 */
async function getEarningsRanking(guildId, limit = 10) {
  const stats = await db.read(statsPath, {});
  
  const guildStats = Object.entries(stats)
    .filter(([key]) => key.startsWith(`${guildId}_`))
    .map(([key, data]) => ({
      userId: key.split('_')[1],
      totalEarned: data.totalEarned || 0,
      totalSessions: data.totalWorkSessions || 0
    }))
    .sort((a, b) => b.totalEarned - a.totalEarned)
    .slice(0, limit);

  return guildStats;
}

/**
 * Obter emprego mais trabalhado no servidor
 */
async function getMostWorkedJob(guildId) {
  const stats = await db.read(statsPath, {});
  const jobCounts = {};

  Object.entries(stats)
    .filter(([key]) => key.startsWith(`${guildId}_`))
    .forEach(([, data]) => {
      if (data.jobHistory) {
        data.jobHistory.forEach(job => {
          jobCounts[job.jobId] = (jobCounts[job.jobId] || 0) + job.times;
        });
      }
    });

  const sorted = Object.entries(jobCounts)
    .sort((a, b) => b[1] - a[1]);

  return sorted.length > 0 ? { jobId: sorted[0][0], times: sorted[0][1] } : null;
}

module.exports = {
  getUserJobStats,
  updateJobStats,
  resetStreak,
  getEarningsRanking,
  getMostWorkedJob
};

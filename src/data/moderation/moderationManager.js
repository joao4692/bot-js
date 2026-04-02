const path = require('path');
const db = require('../../utils/database');

const historyFilePath = path.join(__dirname, '../../data/moderation/history.json');

/**
 * Adds a punishment record to a user's history.
 * @param {string} guildId The ID of the guild where the punishment occurred.
 * @param {string} userId The ID of the user who was punished.
 * @param {object} punishmentData The punishment details.
 * @param {string} punishmentData.type The type of punishment (e.g., 'warn', 'kick', 'ban').
 * @param {string} punishmentData.reason The reason for the punishment.
 * @param {string} punishmentData.moderatorId The ID of the moderator who issued the punishment.
 */
async function addPunishment(guildId, userId, punishmentData) {
    const allHistory = await db.read(historyFilePath, {});
    const userKey = `${guildId}_${userId}`;

    if (!allHistory[userKey]) {
        allHistory[userKey] = [];
    }

    allHistory[userKey].push({
        ...punishmentData,
        timestamp: new Date(),
    });

    await db.write(historyFilePath, allHistory);
}

/**
 * Retrieves the punishment history for a specific user in a guild.
 * @param {string} guildId The ID of the guild.
 * @param {string} userId The ID of the user.
 * @returns {Promise<Array<object>>} The user's punishment history.
 */
async function getUserHistory(guildId, userId) {
    const allHistory = await db.read(historyFilePath, {});
    const userKey = `${guildId}_${userId}`;
    return allHistory[userKey] || [];
}

module.exports = { addPunishment, getUserHistory };

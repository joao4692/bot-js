const path = require('path');
const db = require('../../utils/database');

const userRpFilePath = path.join(__dirname, '../../data/rp/users_rp.json');

const defaultRpProfile = {
    job: null, // The ID of the user's current job
    inventory: [], // Array of item objects { itemId, name, quantity }
};

/**
 * Gets the RP profile for a specific user in a guild.
 * @param {string} guildId The ID of the guild.
 * @param {string} userId The ID of the user.
 * @returns {Promise<object>} The user's RP profile.
 */
async function getRpProfile(guildId, userId) {
    const allProfiles = await db.read(userRpFilePath, {});
    const userKey = `${guildId}_${userId}`;

    if (!allProfiles[userKey]) {
        allProfiles[userKey] = defaultRpProfile;
        await db.write(userRpFilePath, allProfiles);
    }

    return allProfiles[userKey];
}

/**
 * Saves the RP profile for a specific user in a guild.
 * @param {string} guildId The ID of the guild.
 * @param {string} userId The ID of the user.
 * @param {object} data The RP profile data to save.
 */
async function saveRpProfile(guildId, userId, data) {
    const allProfiles = await db.read(userRpFilePath, {});
    const userKey = `${guildId}_${userId}`;
    allProfiles[userKey] = data;
    await db.write(userRpFilePath, allProfiles);
}

module.exports = { getRpProfile, saveRpProfile };

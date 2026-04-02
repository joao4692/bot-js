const config = require("../../config/config.js");
const provider = require("./detranProvider");

function getKey(userId, guildId) {
  return config.economyMode === "guild"
    ? `${guildId}_${userId}`
    : userId;
}

// Padronizado: (guildId, userId)
async function getDetranData(guildId, userId) {
  return await provider.getUser(getKey(userId, guildId));
}

async function saveDetranData(guildId, userId, data) {
  return await provider.saveUser(getKey(userId, guildId), data);
}

async function getAllDetranData(guildId) {
  const allData = await provider.getAll();

  // Se não for guild mode, não há como separar por guild pelo key
  if (config.economyMode !== 'guild') {
    return allData;
  }

  const prefix = `${guildId}_`;
  const result = {};
  for (const key of Object.keys(allData || {})) {
    if (key.startsWith(prefix)) {
      const userId = key.slice(prefix.length);
      result[userId] = allData[key];
    }
  }
  return result;
}

module.exports = { getDetranData, saveDetranData, getAllDetranData };

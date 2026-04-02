const config = require("../../config/config.js");
const provider = require("./policeProvider");

function getKey(userId, guildId) {
  // Police data is always guild-specific
  return `${guildId}_${userId}`;
}

async function getPoliceData(userId, guildId) {
  return await provider.getUser(getKey(userId, guildId));
}

async function savePoliceData(userId, guildId, data) {
  return await provider.saveUser(getKey(userId, guildId), data);
}

module.exports = { getPoliceData, savePoliceData };

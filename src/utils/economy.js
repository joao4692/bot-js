const logger = require('./logger');

module.exports = {
    getEconomyProfile: async (interaction, guildConfig) => {
        const { getUser } = require('../data/economy/economyManager');
        return await getUser(interaction.guild.id, interaction.user.id, guildConfig);
    },
    setEconomyProfile: async (interaction, guildConfig, profile) => {
        const { saveUser } = require('../data/economy/economyManager');
        return await saveUser(interaction.guild.id, interaction.user.id, guildConfig, profile);
    },
    logEconomy: (msg, ctx) => logger.log('INFO', `[economy] ${msg}`, ctx)
};

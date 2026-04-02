const { Events } = require('discord.js');
const { LOG_TYPES, sendLog } = require('../utils/logManager');

module.exports = {
  name: Events.GuildBanRemove,
  async execute(ban) {
    try {
      await sendLog(ban.client, ban.guild.id, LOG_TYPES.BAN_REMOVE, {
        'Usuário': ban.user.tag,
        'ID do Usuário': ban.user.id,
        'Servidor': ban.guild.name
      });
    } catch (error) {
      console.error('Erro no log de remoção de ban:', error);
    }
  }
};

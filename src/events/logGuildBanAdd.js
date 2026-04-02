const { Events } = require('discord.js');
const { LOG_TYPES, sendLog } = require('../utils/logManager');

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban) {
    try {
      await sendLog(ban.client, ban.guild.id, LOG_TYPES.BAN_ADD, {
        'Usuário': ban.user.tag,
        'ID do Usuário': ban.user.id,
        'Motivo': ban.reason || 'Nenhum motivo fornecido',
        'Servidor': ban.guild.name
      });
    } catch (error) {
      console.error('Erro no log de ban:', error);
    }
  }
};

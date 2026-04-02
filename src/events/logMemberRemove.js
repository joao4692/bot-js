const { Events } = require('discord.js');
const { LOG_TYPES, sendLog } = require('../utils/logManager');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    try {
      await sendLog(member.client, member.guild.id, LOG_TYPES.MEMBER_LEAVE, {
        'Usuário': `${member.user.tag}`,
        'ID': member.id,
        'Cargos': member.roles.cache.map(r => r.name).join(', ') || 'Nenhum',
        'Servidor': member.guild.name
      });
    } catch (error) {
      console.error('Erro no log de saída:', error);
    }
  }
};

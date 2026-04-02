const { Events } = require('discord.js');
const { LOG_TYPES, sendLog } = require('../utils/logManager');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      await sendLog(member.client, member.guild.id, LOG_TYPES.MEMBER_JOIN, {
        'Usuário': `${member.user.tag}`,
        'ID': member.id,
        'Conta Criada': `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`,
        'Servidor': member.guild.name
      });
    } catch (error) {
      console.error('Erro no log de entrada:', error);
    }
  }
};

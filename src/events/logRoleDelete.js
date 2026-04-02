const { Events } = require('discord.js');
const { LOG_TYPES, sendLog } = require('../utils/logManager');

module.exports = {
  name: Events.RoleDelete,
  async execute(role) {
    try {
      await sendLog(role.client, role.guild.id, LOG_TYPES.ROLE_DELETE, {
        'Cargo': role.name,
        'ID': role.id,
        'Cor': role.hexColor,
        'Posição': role.position
      });
    } catch (error) {
      console.error('Erro no log de exclusão de cargo:', error);
    }
  }
};

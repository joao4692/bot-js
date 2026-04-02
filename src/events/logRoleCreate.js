const { Events } = require('discord.js');
const { LOG_TYPES, sendLog } = require('../utils/logManager');

module.exports = {
  name: Events.RoleCreate,
  async execute(role) {
    try {
      await sendLog(role.client, role.guild.id, LOG_TYPES.ROLE_CREATE, {
        'Cargo': role.name,
        'ID': role.id,
        'Cor': role.hexColor,
        'Posição': role.position
      });
    } catch (error) {
      console.error('Erro no log de criação de cargo:', error);
    }
  }
};

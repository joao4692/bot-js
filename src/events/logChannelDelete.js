const { Events } = require('discord.js');
const { LOG_TYPES, sendLog } = require('../utils/logManager');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel) {
    try {
      await sendLog(channel.client, channel.guildId, LOG_TYPES.CHANNEL_DELETE, {
        'Canal': channel.name,
        'ID': channel.id,
        'Tipo': channel.type,
        'Categoria': channel.parent?.name || 'Nenhuma'
      });
    } catch (error) {
      console.error('Erro no log de exclusão de canal:', error);
    }
  }
};

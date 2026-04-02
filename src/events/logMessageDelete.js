const { Events } = require('discord.js');
const { LOG_TYPES, sendLog } = require('../utils/logManager');

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    try {
      // Ignorar mensagens de bots por padrão (opcional)
      if (message.author?.bot) return;

      const content = message.content || '*Mensagem vazia ou sem texto*';
      const author = message.author?.tag || 'Desconhecido';
      const authorId = message.author?.id || 'N/A';

      await sendLog(message.client, message.guildId, LOG_TYPES.MESSAGE_DELETE, {
        'Autor': author,
        'ID do Autor': authorId,
        'Canal': `<#${message.channelId}>`,
        'Conteúdo': content.length > 100 ? content.substring(0, 97) + '...' : content,
        'ID da Mensagem': message.id
      });
    } catch (error) {
      console.error('Erro no log de mensagem deletada:', error);
    }
  }
};

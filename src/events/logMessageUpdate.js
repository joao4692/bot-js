const { Events } = require('discord.js');
const { LOG_TYPES, sendLog } = require('../utils/logManager');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    try {
      // Ignorar se o conteúdo é igual
      if (oldMessage.content === newMessage.content) return;

      // Ignorar mensagens de bots por padrão (opcional)
      if (newMessage.author?.bot) return;

      const oldContent = oldMessage.content || '*Vazio*';
      const newContent = newMessage.content || '*Vazio*';

      await sendLog(newMessage.client, newMessage.guildId, LOG_TYPES.MESSAGE_UPDATE, {
        'Autor': newMessage.author?.tag || 'Desconhecido',
        'ID do Autor': newMessage.author?.id || 'N/A',
        'Canal': `<#${newMessage.channelId}>`,
        'Conteúdo Antigo': oldContent.length > 100 ? oldContent.substring(0, 97) + '...' : oldContent,
        'Conteúdo Novo': newContent.length > 100 ? newContent.substring(0, 97) + '...' : newContent,
        'ID da Mensagem': newMessage.id
      });
    } catch (error) {
      console.error('Erro no log de mensagem editada:', error);
    }
  }
};

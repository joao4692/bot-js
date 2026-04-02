const { Events } = require('discord.js');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message, client) {
    // Ignorar mensagens de bots
    if (message.author.bot) return;

    // Verificar se o SimpleErrorMonitor está inicializado
    if (!client.errorMonitor) {
      return;
    }

    // Processar mensagem através do monitor
    try {
      await client.errorMonitor.processMessage(message);
    } catch (error) {
      console.error('Erro ao processar mensagem no SimpleErrorMonitor:', error);
    }
  }
};

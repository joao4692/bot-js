const { EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

class SimpleErrorMonitor {
  constructor(client) {
    this.client = client;
    this.monitoredChannels = new Set();
    this.reportChannel = null;
    this.reportedErrors = new Map(); // messageId -> error data
    this.loadConfig();
  }

  // Carregar configuração
  loadConfig() {
    try {
      const configPath = path.join(__dirname, '../data/error-monitor.json');
      const configDir = path.dirname(configPath);
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      if (!fs.existsSync(configPath)) {
        const defaultConfig = {
          monitoredChannels: [],
          reportChannel: null
        };
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
        this.monitoredChannels = new Set(defaultConfig.monitoredChannels);
        this.reportChannel = defaultConfig.reportChannel;
      } else {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.monitoredChannels = new Set(config.monitoredChannels || []);
        this.reportChannel = config.reportChannel || null;
      }
      
      console.log('✅ [SimpleErrorMonitor] Configuração carregada');
      console.log(`   - Canais monitorados: ${this.monitoredChannels.size}`);
      console.log(`   - Canal de report: ${this.reportChannel ? 'Configurado' : 'Não configurado'}`);
      
    } catch (error) {
      console.error('❌ [SimpleErrorMonitor] Erro ao carregar configuração:', error);
      this.monitoredChannels = new Set();
      this.reportChannel = null;
    }
  }

  // Salvar configuração
  saveConfig() {
    try {
      const configPath = path.join(__dirname, '../data/error-monitor.json');
      const configDir = path.dirname(configPath);
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const config = {
        monitoredChannels: Array.from(this.monitoredChannels),
        reportChannel: this.reportChannel
      };
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log('✅ [SimpleErrorMonitor] Configuração salva');
      
    } catch (error) {
      console.error('❌ [SimpleErrorMonitor] Erro ao salvar configuração:', error);
    }
  }

  // Adicionar canal monitorado
  addMonitoredChannel(guildId, channelId) {
    this.monitoredChannels.add(`${guildId}_${channelId}`);
    this.saveConfig();
    return true;
  }

  // Remover canal monitorado
  removeMonitoredChannel(guildId, channelId) {
    this.monitoredChannels.delete(`${guildId}_${channelId}`);
    this.saveConfig();
    return true;
  }

  // Definir canal de report
  setReportChannel(guildId, channelId) {
    this.reportChannel = channelId;
    this.saveConfig();
    return true;
  }

  // Verificar se canal é monitorado
  isChannelMonitored(guildId, channelId) {
    return this.monitoredChannels.has(`${guildId}_${channelId}`);
  }

  // Processar mensagem
  async processMessage(message) {
    const guildId = message.guild.id;
    const channelId = message.channel.id;

    // Verificar se canal é monitorado
    if (!this.isChannelMonitored(guildId, channelId)) {
      return;
    }

    // Ignorar mensagens de bots
    if (message.author.bot) {
      return;
    }

    // Verificar se a mensagem contém palavras-chave de erro
    if (this.containsErrorKeywords(message.content)) {
      await this.reportError(message);
    }
  }

  // Verificar se mensagem contém palavras-chave de erro
  containsErrorKeywords(content) {
    const errorKeywords = [
      'erro', 'error', 'bug', 'problema', 'não funciona', 'funciona não',
      'comando não funciona', 'deu erro', 'está com erro', 'tem erro',
      'está bugado', 'bugado', 'quebrado', 'parou de funcionar',
      'não consigo', 'consigo não', 'ajuda erro', 'me ajuda erro'
    ];

    const lowerContent = content.toLowerCase();
    return errorKeywords.some(keyword => lowerContent.includes(keyword));
  }

  // Reportar erro
  async reportError(message) {
    if (!this.reportChannel) {
      console.warn('Canal de report não configurado');
      return;
    }

    try {
      const reportChannel = await this.client.channels.fetch(this.reportChannel);
      
      if (!reportChannel || reportChannel.type !== ChannelType.GuildText) {
        console.error('Canal de report inválido');
        return;
      }

      // Criar embed do erro
      const embed = new EmbedBuilder()
        .setTitle('🚨 Usuário Reportou Erro')
        .setColor('#ff4444')
        .setTimestamp()
        .addFields(
          {
            name: '👤 Usuário',
            value: `${message.author.tag} (${message.author.id})`,
            inline: true
          },
          {
            name: '💬 Canal',
            value: `#${message.channel.name}`,
            inline: true
          },
          {
            name: '📝 Mensagem Original',
            value: message.content,
            inline: false
          },
          {
            name: '🔗 Link da Mensagem',
            value: `[Ir para a mensagem](${message.url})`,
            inline: false
          }
        )
        .setFooter({ 
          text: `ID da Mensagem: ${message.id} • Use /corrigir-erro para marcar como resolvido` 
        });

      // Enviar relatório
      const reportMessage = await reportChannel.send({ embeds: [embed] });
      
      // Salvar referência do erro
      this.reportedErrors.set(message.id, {
        originalMessageId: message.id,
        reportMessageId: reportMessage.id,
        userId: message.author.id,
        channelId: message.channel.id,
        content: message.content,
        timestamp: Date.now(),
        status: 'pending' // pending, resolved
      });

      console.log(`🚨 [SimpleErrorMonitor] Erro reportado: ${message.author.tag} - ${message.content.substring(0, 50)}...`);

    } catch (error) {
      console.error('Erro ao reportar erro:', error);
    }
  }

  // Marcar erro como corrigido
  async markAsResolved(originalMessageId, moderatorId, solution = '') {
    const errorData = this.reportedErrors.get(originalMessageId);
    
    if (!errorData) {
      throw new Error('Erro não encontrado no sistema');
    }

    try {
      // Atualizar status
      errorData.status = 'resolved';
      errorData.resolvedBy = moderatorId;
      errorData.resolvedAt = Date.now();
      errorData.solution = solution;

      // Atualizar mensagem no canal de report
      if (this.reportChannel) {
        const reportChannel = await this.client.channels.fetch(this.reportChannel);
        const reportMessage = await reportChannel.messages.fetch(errorData.reportMessageId);
        
        const resolvedEmbed = EmbedBuilder.from(reportMessage.embeds[0])
          .setColor('#00ff00')
          .setTitle('✅ Erro Resolvido')
          .addFields(
            {
              name: '🔧 Resolvido por',
              value: `<@${moderatorId}>`,
              inline: true
            },
            {
              name: '⏰ Resolvido em',
              value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
              inline: true
            }
          );

        if (solution) {
          resolvedEmbed.addFields({
            name: '💡 Solução',
            value: solution,
            inline: false
          });
        }

        await reportMessage.edit({ embeds: [resolvedEmbed] });
      }

      // Salvar no histórico
      this.saveErrorHistory(errorData);
      
      // Remover dos ativos
      this.reportedErrors.delete(originalMessageId);

      console.log(`✅ [SimpleErrorMonitor] Erro marcado como resolvido: ${originalMessageId}`);
      return true;

    } catch (error) {
      console.error('Erro ao marcar como resolvido:', error);
      throw error;
    }
  }

  // Salvar erro no histórico
  saveErrorHistory(errorData) {
    try {
      const historyPath = path.join(__dirname, '../data/error-history.json');
      const historyDir = path.dirname(historyPath);
      
      if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
      }

      let history = [];
      if (fs.existsSync(historyPath)) {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      }

      history.push(errorData);

      // Manter apenas os últimos 1000 registros
      if (history.length > 1000) {
        history = history.slice(-1000);
      }

      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
    }
  }

  // Obter estatísticas
  getStats() {
    const pending = Array.from(this.reportedErrors.values()).filter(e => e.status === 'pending').length;
    const resolved = Array.from(this.reportedErrors.values()).filter(e => e.status === 'resolved').length;
    
    return {
      pending,
      resolved,
      total: this.reportedErrors.size
    };
  }

  // Listar erros pendentes
  getPendingErrors() {
    return Array.from(this.reportedErrors.values())
      .filter(error => error.status === 'pending')
      .sort((a, b) => b.timestamp - a.timestamp);
  }
}

module.exports = SimpleErrorMonitor;

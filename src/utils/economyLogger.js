const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const economyLogsPath = path.join(__dirname, '../data/economyLogs.json');

/**
 * SISTEMA AVANÇADO DE LOGS PARA ECONOMIA
 * Logging completo e detalhado de todas as operações econômicas
 */

class EconomyLogger {
  constructor() {
    this.logs = [];
    this.loadLogs();
  }

  /**
   * Carregar logs existentes
   */
  async loadLogs() {
    try {
      if (fs.existsSync(economyLogsPath)) {
        const data = fs.readFileSync(economyLogsPath, 'utf8');
        this.logs = JSON.parse(data);
      }
    } catch (error) {
      console.error('Erro ao carregar logs da economia:', error);
      this.logs = [];
    }
  }

  /**
   * Salvar logs no arquivo
   */
  async saveLogs() {
    try {
      // Manter apenas últimos 10000 logs para não sobrecarregar
      const logsToSave = this.logs.slice(-10000);
      fs.writeFileSync(economyLogsPath, JSON.stringify(logsToSave, null, 2));
    } catch (error) {
      console.error('Erro ao salvar logs da economia:', error);
    }
  }

  /**
   * Adicionar log
   */
  async addLog(category, action, details, guildId, userId) {
    const logEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      category,
      action,
      details,
      guildId,
      userId,
      severity: this.getSeverity(category, action),
      metadata: {
        userAgent: 'Discord Bot',
        version: '2.0.0'
      }
    };

    this.logs.push(logEntry);
    await this.saveLogs();

    // Enviar para canal de logs se configurado
    await this.sendToDiscordChannel(logEntry);

    return logEntry;
  }

  /**
   * Gerar ID único para log
   */
  generateLogId() {
    return `econ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Determinar severidade do log
   */
  getSeverity(category, action) {
    const severityMap = {
      'bank': {
        'deposit': 'info',
        'withdraw': 'info',
        'transfer': 'info',
        'loan_request': 'warning',
        'loan_payment': 'info',
        'account_created': 'info',
        'account_blocked': 'error',
        'fraud_detected': 'critical'
      },
      'shop': {
        'purchase': 'info',
        'refund': 'warning',
        'item_added': 'info',
        'item_removed': 'warning',
        'discount_applied': 'info'
      },
      'work': {
        'work_completed': 'info',
        'bonus_received': 'info',
        'cooldown_active': 'warning',
        'job_changed': 'info'
      },
      'daily': {
        'claim': 'info',
        'streak_bonus': 'info',
        'streak_lost': 'warning'
      },
      'investments': {
        'investment_created': 'info',
        'investment_withdrawn': 'info',
        'investment_matured': 'info',
        'investment_failed': 'error'
      }
    };

    return severityMap[category]?.[action] || 'info';
  }

  /**
   * Enviar log para canal do Discord
   */
  async sendToDiscordChannel(logEntry) {
    try {
      // Esta função seria implementada com base na configuração do servidor
      // Por enquanto, apenas log no console
      if (logEntry.severity === 'critical' || logEntry.severity === 'error') {
        console.error(`[ECONOMY LOG] ${logEntry.severity.toUpperCase()}: ${logEntry.action}`, logEntry.details);
      }
    } catch (error) {
      console.error('Erro ao enviar log para Discord:', error);
    }
  }

  /**
   * Buscar logs com filtros
   */
  async searchLogs(filters = {}) {
    let filteredLogs = [...this.logs];

    // Filtrar por categoria
    if (filters.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filters.category);
    }

    // Filtrar por ação
    if (filters.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action);
    }

    // Filtrar por usuário
    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }

    // Filtrar por servidor
    if (filters.guildId) {
      filteredLogs = filteredLogs.filter(log => log.guildId === filters.guildId);
    }

    // Filtrar por severidade
    if (filters.severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === filters.severity);
    }

    // Filtrar por período
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= endDate);
    }

    // Limitar resultados
    if (filters.limit) {
      filteredLogs = filteredLogs.slice(-filters.limit);
    }

    return filteredLogs;
  }

  /**
   * Obter estatísticas dos logs
   */
  async getStatistics(guildId, period = '24h') {
    const now = new Date();
    let startDate;

    switch (period) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const periodLogs = this.logs.filter(log => 
      log.guildId === guildId && 
      new Date(log.timestamp) >= startDate
    );

    const stats = {
      total: periodLogs.length,
      byCategory: {},
      byAction: {},
      bySeverity: {},
      byHour: {},
      topUsers: {},
      period
    };

    periodLogs.forEach(log => {
      // Por categoria
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;

      // Por ação
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

      // Por severidade
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;

      // Por hora
      const hour = new Date(log.timestamp).getHours();
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;

      // Top usuários
      if (log.userId) {
        stats.topUsers[log.userId] = (stats.topUsers[log.userId] || 0) + 1;
      }
    });

    // Ordenar top usuários
    stats.topUsers = Object.entries(stats.topUsers)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));

    return stats;
  }

  /**
   * Gerar embed de logs
   */
  generateLogEmbed(logEntry) {
    const colors = {
      'info': '#0099ff',
      'warning': '#ffaa00',
      'error': '#ff0000',
      'critical': '#ff00ff'
    };

    const emojis = {
      'bank': '🏦',
      'shop': '🛒',
      'work': '💼',
      'daily': '📅',
      'investments': '📈'
    };

    const embed = new EmbedBuilder()
      .setColor(colors[logEntry.severity] || '#0099ff')
      .setTitle(`${emojis[logEntry.category] || '📊'} ${logEntry.action}`)
      .setTimestamp(new Date(logEntry.timestamp))
      .addFields(
        { name: '📋 Categoria', value: logEntry.category, inline: true },
        { name: '🆔 ID', value: logEntry.id, inline: true },
        { name: '⚠️ Severidade', value: logEntry.severity.toUpperCase(), inline: true }
      );

    // Adicionar detalhes
    if (logEntry.details) {
      const detailsText = Object.entries(logEntry.details)
        .map(([key, value]) => `• **${key}:** ${value}`)
        .join('\n');

      embed.addFields({
        name: '📄 Detalhes',
        value: detailsText,
        inline: false
      });
    }

    return embed;
  }

  /**
   * Limpar logs antigos
   */
  async cleanup(daysToKeep = 30) {
    const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));
    
    const originalCount = this.logs.length;
    this.logs = this.logs.filter(log => new Date(log.timestamp) >= cutoffDate);
    
    await this.saveLogs();
    
    const removedCount = originalCount - this.logs.length;
    
    return {
      success: true,
      removedCount,
      remainingCount: this.logs.length
    };
  }

  /**
   * Exportar logs
   */
  async exportLogs(filters = {}, format = 'json') {
    const logs = await this.searchLogs(filters);

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      
      case 'csv':
        const headers = ['ID', 'Timestamp', 'Category', 'Action', 'Severity', 'Guild ID', 'User ID', 'Details'];
        const csvRows = logs.map(log => [
          log.id,
          log.timestamp,
          log.category,
          log.action,
          log.severity,
          log.guildId,
          log.userId || '',
          JSON.stringify(log.details)
        ]);
        
        return [headers, ...csvRows].map(row => row.join(',')).join('\n');
      
      case 'txt':
        return logs.map(log => 
          `[${log.timestamp}] ${log.severity.toUpperCase()} - ${log.category}:${log.action}\n${JSON.stringify(log.details, null, 2)}\n`
        ).join('\n---\n');
      
      default:
        return JSON.stringify(logs, null, 2);
    }
  }
}

// Instância global do logger
const economyLogger = new EconomyLogger();

// Métodos de conveniência
module.exports = {
  // Logs de Banco
  bankDeposit: (userId, guildId, details) => 
    economyLogger.addLog('bank', 'deposit', details, guildId, userId),
  
  bankWithdraw: (userId, guildId, details) => 
    economyLogger.addLog('bank', 'withdraw', details, guildId, userId),
  
  bankTransfer: (userId, guildId, details) => 
    economyLogger.addLog('bank', 'transfer', details, guildId, userId),
  
  bankLoanRequest: (userId, guildId, details) => 
    economyLogger.addLog('bank', 'loan_request', details, guildId, userId),
  
  bankLoanPayment: (userId, guildId, details) => 
    economyLogger.addLog('bank', 'loan_payment', details, guildId, userId),

  // Logs de Loja
  shopPurchase: (userId, guildId, details) => 
    economyLogger.addLog('shop', 'purchase', details, guildId, userId),
  
  shopRefund: (userId, guildId, details) => 
    economyLogger.addLog('shop', 'refund', details, guildId, userId),

  // Logs de Trabalho
  workCompleted: (userId, guildId, details) => 
    economyLogger.addLog('work', 'work_completed', details, guildId, userId),
  
  workBonus: (userId, guildId, details) => 
    economyLogger.addLog('work', 'bonus_received', details, guildId, userId),

  // Logs de Recompensas Diárias
  dailyClaim: (userId, guildId, details) => 
    economyLogger.addLog('daily', 'claim', details, guildId, userId),
  
  dailyStreakBonus: (userId, guildId, details) => 
    economyLogger.addLog('daily', 'streak_bonus', details, guildId, userId),

  // Logs de Investimentos
  investmentCreated: (userId, guildId, details) => 
    economyLogger.addLog('investments', 'investment_created', details, guildId, userId),
  
  investmentWithdrawn: (userId, guildId, details) => 
    economyLogger.addLog('investments', 'investment_withdrawn', details, guildId, userId),

  // Métodos gerais
  addLog: (category, action, details, guildId, userId) => 
    economyLogger.addLog(category, action, details, guildId, userId),
  
  searchLogs: (filters) => economyLogger.searchLogs(filters),
  
  getStatistics: (guildId, period) => economyLogger.getStatistics(guildId, period),
  
  cleanup: (daysToKeep) => economyLogger.cleanup(daysToKeep),
  
  exportLogs: (filters, format) => economyLogger.exportLogs(filters, format),
  
  generateLogEmbed: (logEntry) => economyLogger.generateLogEmbed(logEntry),
  
  // Instância para acesso direto
  instance: economyLogger
};

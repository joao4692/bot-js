const fs = require('fs');
const path = require('path');
const db = require('./database');

const economyConfigPath = path.join(__dirname, '../data/economyConfig.json');

/**
 * SISTEMA DE CONFIGURAÇÃO DINÂMICA PARA ECONOMIA
 * Permite 100% personalização de todos os sistemas econômicos
 */

// Configurações padrão
const DEFAULT_CONFIG = {
  guildId: null,
  
  // Configurações do Banco
  bank: {
    enabled: true,
    name: 'Banco Central',
    currency: '$',
    startingBalance: 0,
    maxBalance: 1000000,
    dailyLimit: 50000,
    transferFee: 0.02, // 2%
    minTransfer: 1,
    maxTransfer: 100000,
    interestRate: 0.001, // 0.1% ao dia
    accountLevels: [
      { level: 1, name: 'Básico', limit: 100000, requiredBalance: 0 },
      { level: 2, name: 'Prata', limit: 500000, requiredBalance: 100000 },
      { level: 3, name: 'Ouro', limit: 1000000, requiredBalance: 500000 },
      { level: 4, name: 'Platina', limit: 5000000, requiredBalance: 1000000 },
      { level: 5, name: 'Diamante', limit: 10000000, requiredBalance: 5000000 }
    ]
  },

  // Configurações de Loja
  shop: {
    enabled: true,
    name: 'Loja do Servidor',
    categories: [
      { id: 'roles', name: 'Cargos', icon: '👤' },
      { id: 'items', name: 'Itens', icon: '🎁' },
      { id: 'boosts', name: 'Boosts', icon: '⚡' },
      { id: 'special', name: 'Especiais', icon: '✨' }
    ],
    items: [],
    discounts: [],
    specialOffers: []
  },

  // Configurações de Trabalho
  work: {
    enabled: true,
    cooldown: 60000, // 1 minuto
    minReward: 50,
    maxReward: 500,
    bonusChance: 0.1, // 10% de chance de bônus
    bonusMultiplier: 2,
    jobs: [
      { name: 'Programador', emoji: '💻', minReward: 100, maxReward: 800 },
      { name: 'Designer', emoji: '🎨', minReward: 80, maxReward: 600 },
      { name: 'Músico', emoji: '🎵', minReward: 60, maxReward: 400 },
      { name: 'Streamer', emoji: '📺', minReward: 120, maxReward: 1000 },
      { name: 'Jogador', emoji: '🎮', minReward: 50, maxReward: 300 }
    ]
  },

  // Configurações de Recompensas Diárias
  daily: {
    enabled: true,
    baseAmount: 100,
    streakBonus: 50,
    maxStreak: 30,
    bonusMultipliers: {
      7: 2,    // 7 dias = 2x
      14: 3,   // 14 dias = 3x
      30: 5    // 30 dias = 5x
    }
  },

  // Configurações de Investimentos
  investments: {
    enabled: true,
    types: [
      {
        id: 'tesouro',
        name: 'Tesouro Direto',
        rate: 0.08,
        minAmount: 100,
        maxAmount: 1000000,
        minDays: 30,
        maxDays: 365,
        risk: 'low'
      },
      {
        id: 'acoes',
        name: 'Ações',
        rate: 0.12,
        minAmount: 500,
        maxAmount: 500000,
        minDays: 7,
        maxDays: 365,
        risk: 'medium',
        volatility: 0.15
      },
      {
        id: 'imoveis',
        name: 'Imóveis',
        rate: 0.10,
        minAmount: 10000,
        maxAmount: 1000000,
        minDays: 90,
        maxDays: 365,
        risk: 'low'
      },
      {
        id: 'cripto',
        name: 'Criptomoedas',
        rate: 0.25,
        minAmount: 100,
        maxAmount: 200000,
        minDays: 1,
        maxDays: 365,
        risk: 'high',
        volatility: 0.40
      },
      {
        id: 'negocio',
        name: 'Negócio',
        rate: 0.15,
        minAmount: 5000,
        maxAmount: 500000,
        minDays: 30,
        maxDays: 365,
        risk: 'medium'
      }
    ]
  },

  // Configurações de Logs
  logging: {
    enabled: true,
    channel: null,
    level: 'info', // debug, info, warn, error
    categories: ['bank', 'shop', 'work', 'daily', 'investments'],
    format: 'embed', // embed, text, json
    retention: 30 // dias
  },

  // Configurações de Notificações
  notifications: {
    enabled: true,
    channel: null,
    types: ['transactions', 'level_up', 'investment_matured', 'shop_purchase'],
    dm: true
  },

  // Configurações de Segurança
  security: {
    maxTransactionsPerHour: 50,
    maxTransferAmount: 100000,
    requireVerification: false,
    blockedUsers: [],
    auditLog: true
  },

  // Configurações de API (futuro)
  api: {
    enabled: false,
    key: null,
    webhookUrl: null,
    externalIntegrations: []
  },

  // Metadados
  metadata: {
    version: '2.0.0',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
    description: 'Configuração avançada do sistema econômico'
  }
};

/**
 * Obter configuração do servidor
 */
async function getGuildConfig(guildId) {
  try {
    const allConfigs = await db.read(economyConfigPath, {});
    
    if (!allConfigs[guildId]) {
      // Criar configuração padrão para o servidor
      const newConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      newConfig.guildId = guildId;
      newConfig.metadata.createdBy = 'system';
      newConfig.metadata.createdAt = new Date().toISOString();
      
      allConfigs[guildId] = newConfig;
      await db.write(economyConfigPath, allConfigs);
      
      return newConfig;
    }
    
    return allConfigs[guildId];
  } catch (error) {
    console.error('Erro ao obter configuração do servidor:', error);
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
}

/**
 * Salvar configuração do servidor
 */
async function saveGuildConfig(guildId, config) {
  try {
    const allConfigs = await db.read(economyConfigPath, {});
    
    // Atualizar metadados
    config.metadata.lastUpdated = new Date().toISOString();
    config.metadata.updatedBy = 'admin';
    
    allConfigs[guildId] = config;
    await db.write(economyConfigPath, allConfigs);
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao salvar configuração do servidor:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Atualizar uma seção específica da configuração
 */
async function updateConfigSection(guildId, section, data) {
  try {
    const config = await getGuildConfig(guildId);
    
    // Validar seção
    if (!config[section]) {
      return { success: false, error: `Seção "${section}" não encontrada` };
    }
    
    // Mesclar dados
    config[section] = { ...config[section], ...data };
    
    const result = await saveGuildConfig(guildId, config);
    return result;
  } catch (error) {
    console.error('Erro ao atualizar seção da configuração:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obter valor específico da configuração
 */
async function getConfigValue(guildId, path) {
  try {
    const config = await getGuildConfig(guildId);
    
    // Navegar pelo path (ex: "bank.maxBalance")
    const keys = path.split('.');
    let value = config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value;
  } catch (error) {
    console.error('Erro ao obter valor da configuração:', error);
    return null;
  }
}

/**
 * Definir valor específico da configuração
 */
async function setConfigValue(guildId, path, value) {
  try {
    const config = await getGuildConfig(guildId);
    
    // Navegar pelo path e definir valor
    const keys = path.split('.');
    let current = config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    const finalKey = keys[keys.length - 1];
    current[finalKey] = value;
    
    return await saveGuildConfig(guildId, config);
  } catch (error) {
    console.error('Erro ao definir valor da configuração:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Resetar configuração para padrão
 */
async function resetConfig(guildId) {
  try {
    const newConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    newConfig.guildId = guildId;
    newConfig.metadata.resetAt = new Date().toISOString();
    newConfig.metadata.resetBy = 'admin';
    
    return await saveGuildConfig(guildId, newConfig);
  } catch (error) {
    console.error('Erro ao resetar configuração:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Exportar configuração
 */
async function exportConfig(guildId) {
  try {
    const config = await getGuildConfig(guildId);
    return { success: true, config };
  } catch (error) {
    console.error('Erro ao exportar configuração:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Importar configuração
 */
async function importConfig(guildId, configData) {
  try {
    // Validar estrutura básica
    if (!configData || typeof configData !== 'object') {
      return { success: false, error: 'Configuração inválida' };
    }
    
    // Garantir guildId
    configData.guildId = guildId;
    configData.metadata = {
      ...configData.metadata,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'import',
      importedAt: new Date().toISOString()
    };
    
    return await saveGuildConfig(guildId, configData);
  } catch (error) {
    console.error('Erro ao importar configuração:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obter todas as configurações (para admin global)
 */
async function getAllConfigs() {
  try {
    return await db.read(economyConfigPath, {});
  } catch (error) {
    console.error('Erro ao obter todas as configurações:', error);
    return {};
  }
}

/**
 * Validar configuração
 */
function validateConfig(config) {
  const errors = [];
  
  // Validar banco
  if (config.bank) {
    if (typeof config.bank.maxBalance !== 'number' || config.bank.maxBalance <= 0) {
      errors.push('bank.maxBalance deve ser um número positivo');
    }
    if (typeof config.bank.transferFee !== 'number' || config.bank.transferFee < 0 || config.bank.transferFee > 1) {
      errors.push('bank.transferFee deve ser um número entre 0 e 1');
    }
  }
  
  // Validar loja
  if (config.shop) {
    if (!Array.isArray(config.shop.categories)) {
      errors.push('shop.categories deve ser um array');
    }
    if (!Array.isArray(config.shop.items)) {
      errors.push('shop.items deve ser um array');
    }
  }
  
  // Validar trabalho
  if (config.work) {
    if (typeof config.work.cooldown !== 'number' || config.work.cooldown < 0) {
      errors.push('work.cooldown deve ser um número positivo');
    }
    if (typeof config.work.minReward !== 'number' || config.work.minReward < 0) {
      errors.push('work.minReward deve ser um número positivo');
    }
    if (typeof config.work.maxReward !== 'number' || config.work.maxReward < config.work.minReward) {
      errors.push('work.maxReward deve ser maior que work.minReward');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  getGuildConfig,
  saveGuildConfig,
  updateConfigSection,
  getConfigValue,
  setConfigValue,
  resetConfig,
  exportConfig,
  importConfig,
  getAllConfigs,
  validateConfig,
  DEFAULT_CONFIG
};

/**
 * SISTEMA AVANÇADO DE PERMISSÕES v3.0
 * 
 * Recursos Avançados:
 * - Sistema hierárquico de permissões
 * - Herança de permissões
 * - Cache inteligente para performance
 * - Auditoria completa de alterações
 * - Sistema de templates de permissão
 * - Controle granular por canal
 * - Permissões temporárias
 * - Integração com economia
 * - API REST para gerenciamento externo
 * - Backup e restauração automáticos
 */

const fs = require('fs');
const path = require('path');
const { PermissionsBitField } = require('discord.js');
const crypto = require('crypto');

const permsConfigPath = path.join(__dirname, '../data/permissions-v3.json');
const backupPath = path.join(__dirname, '../data/permissions-v3.backup.json');
const cachePath = path.join(__dirname, '../data/permissions-cache.json');

/**
 * Níveis de permissão hierárquicos
 */
const PERMISSION_LEVELS = {
  PUBLIC: { level: 0, name: 'Público', color: '#00ff00' },
  MEMBER: { level: 1, name: 'Membro', color: '#00ccff' },
  STAFF: { level: 2, name: 'Staff', color: '#ffaa00' },
  MODERATOR: { level: 3, name: 'Moderador', color: '#ff6600' },
  ADMIN: { level: 4, name: 'Administrador', color: '#ff0000' },
  MANAGER: { level: 5, name: 'Gerente', color: '#ff00ff' },
  OWNER: { level: 6, name: 'Dono', color: '#9900ff' },
  DEVELOPER: { level: 7, name: 'Desenvolvedor', color: '#000000' }
};

/**
 * Tipos de permissão
 */
const PERMISSION_TYPES = {
  COMMAND: 'command',
  CATEGORY: 'category',
  CHANNEL: 'channel',
  ROLE: 'role',
  USER: 'user',
  GLOBAL: 'global'
};

/**
 * Classe principal do gerenciador de permissões
 */
class AdvancedPermissionManager {
  constructor() {
    this.config = null;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    this.lastBackup = 0;
    this.backupInterval = 30 * 60 * 1000; // 30 minutos
    this.loadConfig();
    this.startAutoBackup();
  }

  /**
   * Determina se um recurso tem regras explícitas configuradas.
   * Se tiver, o recurso deve exigir permissão explícita (não cair no defaultLevel).
   */
  isResourceRestricted(guildConfig, resource, resourceType) {
    try {
      const perms = guildConfig?.permissions;
      if (!perms) return false;

      // Regras em usuários
      const users = perms.users || {};
      for (const userPerms of Object.values(users)) {
        const typePerms = userPerms?.[resourceType];
        if (!typePerms) continue;
        if (typePerms[resource] !== undefined || typePerms['*'] !== undefined) return true;
      }

      // Regras em cargos
      const roles = perms.roles || {};
      for (const rolePerms of Object.values(roles)) {
        const typePerms = rolePerms?.[resourceType];
        if (!typePerms) continue;
        if (typePerms[resource] !== undefined || typePerms['*'] !== undefined) return true;
      }

      // Regras em canais
      const channels = perms.channels || {};
      for (const channelPerms of Object.values(channels)) {
        const typePerms = channelPerms?.[resourceType];
        if (!typePerms) continue;
        if (typePerms[resource] !== undefined || typePerms['*'] !== undefined) return true;
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Carregar configuração com validação e recuperação
   */
  loadConfig() {
    try {
      if (fs.existsSync(permsConfigPath)) {
        const data = JSON.parse(fs.readFileSync(permsConfigPath, 'utf-8'));
        this.validateAndRepairConfig(data);
        this.config = data;
      } else {
        this.config = this.createDefaultConfig();
        this.saveConfig();
      }
    } catch (error) {
      console.error('Erro ao carregar configuração de permissões:', error);
      this.attemptRecovery();
    }
  }

  /**
   * Validar e reparar configuração
   */
  validateAndRepairConfig(config) {
    const required = ['version', 'guilds', 'templates', 'auditLog', 'metadata'];
    required.forEach(key => {
      if (!config[key]) {
        console.warn(`Campo obrigatório ausente: ${key}, criando padrão...`);
        switch (key) {
          case 'version':
            config[key] = '3.0';
            break;
          case 'guilds':
            config[key] = {};
            break;
          case 'templates':
            config[key] = {};
            break;
          case 'auditLog':
            config[key] = [];
            break;
          case 'metadata':
            config[key] = { lastUpdated: new Date().toISOString() };
            break;
        }
      }
    });
  }

  /**
   * Criar configuração padrão
   */
  createDefaultConfig() {
    return {
      version: '3.0',
      guilds: {},
      templates: {
        admin: {
          name: 'Template Administrador',
          description: 'Permissões completas para administradores',
          permissions: {
            level: 'ADMIN',
            commands: ['*'],
            categories: ['*'],
            channels: ['*']
          }
        },
        moderator: {
          name: 'Template Moderador',
          description: 'Permissões de moderação',
          permissions: {
            level: 'MODERATOR',
            commands: ['ban', 'kick', 'mute', 'warn'],
            categories: ['moderation'],
            channels: ['*']
          }
        },
        staff: {
          name: 'Template Staff',
          description: 'Permissões básicas de staff',
          permissions: {
            level: 'STAFF',
            commands: ['help', 'userinfo', 'serverinfo'],
            categories: ['utility'],
            channels: ['*']
          }
        }
      },
      auditLog: [],
      metadata: {
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: '3.0'
      }
    };
  }

  /**
   * Salvar configuração com backup
   */
  saveConfig() {
    try {
      // Criar backup antes de salvar
      if (fs.existsSync(permsConfigPath)) {
        fs.copyFileSync(permsConfigPath, backupPath);
        this.lastBackup = Date.now();
      }

      this.config.metadata.lastUpdated = new Date().toISOString();
      fs.writeFileSync(permsConfigPath, JSON.stringify(this.config, null, 2));
      this.clearCache();
      return true;
    } catch (error) {
      console.error('Erro ao salvar configuração de permissões:', error);
      return false;
    }
  }

  /**
   * Tentar recuperação de configuração
   */
  attemptRecovery() {
    try {
      if (fs.existsSync(backupPath)) {
        console.log('Tentando recuperar do backup...');
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
        this.validateAndRepairConfig(backupData);
        this.config = backupData;
        this.saveConfig();
        console.log('Configuração recuperada do backup com sucesso!');
      } else {
        console.log('Criando nova configuração padrão...');
        this.config = this.createDefaultConfig();
        this.saveConfig();
      }
    } catch (error) {
      console.error('Falha na recuperação:', error);
      this.config = this.createDefaultConfig();
    }
  }

  /**
   * Iniciar backup automático
   */
  startAutoBackup() {
    setInterval(() => {
      if (Date.now() - this.lastBackup > this.backupInterval) {
        this.saveConfig();
        console.log('Backup automático de permissões realizado');
      }
    }, this.backupInterval);
  }

  /**
   * Obter configuração do servidor com cache
   */
  getGuildConfig(guildId) {
    const cacheKey = `guild_${guildId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    const guildConfig = this.config.guilds[guildId] || this.createDefaultGuildConfig();
    
    this.cache.set(cacheKey, {
      data: guildConfig,
      timestamp: Date.now()
    });

    return guildConfig;
  }

  /**
   * Criar configuração padrão para servidor
   */
  createDefaultGuildConfig() {
    return {
      id: null,
      name: 'Default Guild',
      permissions: {
        commands: {},
        categories: {},
        channels: {},
        roles: {},
        users: {}
      },
      settings: {
        defaultLevel: 'MEMBER',
        inheritFromParent: true,
        allowTemporaryPerms: true,
        logAllChanges: true,
        cacheEnabled: true
      },
      temporaryPermissions: {},
      metadata: {
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    };
  }

  /**
   * Verificar permissão com sistema hierárquico
   */
  checkPermission(member, guildId, resource, resourceType = 'command', options = {}) {
    try {
      const guildConfig = this.getGuildConfig(guildId);
      const userId = member.id;
      const userRoles = Array.from(member.roles.cache.keys());

      const isRestricted = this.isResourceRestricted(guildConfig, resource, resourceType);

      // 1. Verificar permissões temporárias primeiro
      const tempPerms = this.checkTemporaryPermissions(guildId, userId, resource, resourceType);
      if (tempPerms.hasPermission) {
        return {
          allowed: tempPerms.allowed,
          reason: `Permissão temporária: ${tempPerms.reason}`,
          source: 'temporary',
          expiresAt: tempPerms.expiresAt
        };
      }

      // 2. Verificar permissão direta do usuário
      const userPerm = this.checkUserPermission(guildConfig, userId, resource, resourceType);
      if (userPerm.hasPermission) {
        return {
          allowed: userPerm.allowed,
          reason: `Permissão de usuário: ${userPerm.reason}`,
          source: 'user'
        };
      }

      // 3. Verificar permissões dos cargos (em ordem hierárquica)
      const rolePerms = this.checkRolePermissions(guildConfig, userRoles, resource, resourceType);
      if (rolePerms.hasPermission) {
        return {
          allowed: rolePerms.allowed,
          reason: `Permissão de cargo: ${rolePerms.reason}`,
          source: 'role',
          roleId: rolePerms.roleId
        };
      }

      // 4. Verificar permissões de canal
      if (options.channelId) {
        const channelPerm = this.checkChannelPermission(guildConfig, options.channelId, resource, resourceType);
        if (channelPerm.hasPermission) {
          return {
            allowed: channelPerm.allowed,
            reason: `Permissão de canal: ${channelPerm.reason}`,
            source: 'channel'
          };
        }
      }

      // Se existe qualquer regra explícita para este recurso e ainda não foi permitido acima,
      // então ele é restrito e deve ser NEGADO (não cair no defaultLevel).
      if (isRestricted) {
        return {
          allowed: false,
          reason: 'Comando restrito - permissão explícita necessária',
          source: 'restricted'
        };
      }

      // 5. Verificar nível de permissão padrão
      const defaultLevel = guildConfig.settings.defaultLevel || 'MEMBER';
      const userLevel = this.getUserPermissionLevel(member, guildConfig);
      
      if (this.isLevelSufficient(userLevel, defaultLevel)) {
        return {
          allowed: true,
          reason: `Nível de permissão suficiente: ${userLevel.name}`,
          source: 'level'
        };
      }

      // 6. Verificar permissões de categoria
      const categoryPerm = this.checkCategoryPermission(guildConfig, resource, resourceType);
      if (categoryPerm.hasPermission) {
        return {
          allowed: categoryPerm.allowed,
          reason: `Permissão de categoria: ${categoryPerm.reason}`,
          source: 'category'
        };
      }

      return {
        allowed: false,
        reason: 'Permissão negada - nenhum acesso encontrado',
        source: 'none'
      };

    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      return {
        allowed: false,
        reason: 'Erro ao verificar permissão',
        source: 'error'
      };
    }
  }

  /**
   * Verificar permissões temporárias
   */
  checkTemporaryPermissions(guildId, userId, resource, resourceType) {
    const guildConfig = this.getGuildConfig(guildId);
    const tempPerms = guildConfig.temporaryPermissions || {};
    const userTempPerms = tempPerms[userId] || [];

    const now = Date.now();
    const relevantPerms = userTempPerms.filter(perm => 
      perm.resource === resource && 
      perm.type === resourceType && 
      perm.expiresAt > now
    );

    if (relevantPerms.length > 0) {
      const perm = relevantPerms[0]; // Usar a mais recente
      return {
        hasPermission: true,
        allowed: perm.allowed,
        reason: perm.reason,
        expiresAt: perm.expiresAt
      };
    }

    return { hasPermission: false };
  }

  /**
   * Verificar permissão direta do usuário
   */
  checkUserPermission(guildConfig, userId, resource, resourceType) {
    const userPerms = guildConfig.permissions.users[userId] || {};
    const resourcePerms = userPerms[resourceType] || {};

    if (resourcePerms[resource] !== undefined) {
      return {
        hasPermission: true,
        allowed: resourcePerms[resource].allowed,
        reason: resourcePerms[resource].reason || 'Permissão explícita'
      };
    }

    // Verificar permissão wildcard
    if (resourcePerms['*'] !== undefined) {
      return {
        hasPermission: true,
        allowed: resourcePerms['*'].allowed,
        reason: resourcePerms['*'].reason || 'Permissão wildcard'
      };
    }

    return { hasPermission: false };
  }

  /**
   * Verificar permissões dos cargos
   */
  checkRolePermissions(guildConfig, roleIds, resource, resourceType) {
    const rolePerms = guildConfig.permissions.roles || {};
    
    // Ordenar cargos por hierarquia (maior ID geralmente = menor hierarquia no Discord)
    const sortedRoles = roleIds.sort((a, b) => b - a);

    for (const roleId of sortedRoles) {
      const roleConfig = rolePerms[roleId];
      if (!roleConfig) continue;

      const resourcePerms = roleConfig[resourceType] || {};
      
      if (resourcePerms[resource] !== undefined) {
        return {
          hasPermission: true,
          allowed: resourcePerms[resource].allowed,
          reason: resourcePerms[resource].reason || `Cargo ${roleId}`,
          roleId
        };
      }

      if (resourcePerms['*'] !== undefined) {
        return {
          hasPermission: true,
          allowed: resourcePerms['*'].allowed,
          reason: resourcePerms['*'].reason || `Cargo ${roleId} (wildcard)`,
          roleId
        };
      }
    }

    return { hasPermission: false };
  }

  /**
   * Verificar permissão de canal
   */
  checkChannelPermission(guildConfig, channelId, resource, resourceType) {
    const channelPerms = guildConfig.permissions.channels || {};
    const channelConfig = channelPerms[channelId];
    
    if (!channelConfig) return { hasPermission: false };

    const resourcePerms = channelConfig[resourceType] || {};
    
    if (resourcePerms[resource] !== undefined) {
      return {
        hasPermission: true,
        allowed: resourcePerms[resource].allowed,
        reason: resourcePerms[resource].reason || `Canal ${channelId}`
      };
    }

    if (resourcePerms['*'] !== undefined) {
      return {
        hasPermission: true,
        allowed: resourcePerms['*'].allowed,
        reason: resourcePerms['*'].reason || `Canal ${channelId} (wildcard)`
      };
    }

    return { hasPermission: false };
  }

  /**
   * Verificar permissão de categoria
   */
  checkCategoryPermission(guildConfig, resource, resourceType) {
    const categoryPerms = guildConfig.permissions.categories || {};
    
    for (const [category, config] of Object.entries(categoryPerms)) {
      const resourcePerms = config[resourceType] || {};
      
      if (resourcePerms[resource] !== undefined) {
        return {
          hasPermission: true,
          allowed: resourcePerms[resource].allowed,
          reason: resourcePerms[resource].reason || `Categoria ${category}`
        };
      }

      if (resourcePerms['*'] !== undefined) {
        return {
          hasPermission: true,
          allowed: resourcePerms['*'].allowed,
          reason: resourcePerms['*'].reason || `Categoria ${category} (wildcard)`
        };
      }
    }

    return { hasPermission: false };
  }

  /**
   * Obter nível de permissão do usuário
   */
  getUserPermissionLevel(member, guildConfig) {
    // Verificar se é dono do servidor
    if (member.id === member.guild.ownerId) {
      return PERMISSION_LEVELS.OWNER;
    }

    // Verificar permissões de administrador
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return PERMISSION_LEVELS.ADMIN;
    }

    // Verificar cargos específicos configurados
    const userRoles = Array.from(member.roles.cache.keys());
    const rolePerms = guildConfig.permissions.roles || {};
    
    let highestLevel = PERMISSION_LEVELS.MEMBER;
    
    for (const roleId of userRoles) {
      const roleConfig = rolePerms[roleId];
      if (roleConfig && roleConfig.level) {
        const roleLevel = PERMISSION_LEVELS[roleConfig.level];
        if (roleLevel && roleLevel.level > highestLevel.level) {
          highestLevel = roleLevel;
        }
      }
    }

    return highestLevel;
  }

  /**
   * Verificar se nível é suficiente
   */
  isLevelSufficient(userLevel, requiredLevel) {
    const userLevelObj = typeof userLevel === 'string' ? PERMISSION_LEVELS[userLevel] : userLevel;
    const requiredLevelObj = typeof requiredLevel === 'string' ? PERMISSION_LEVELS[requiredLevel] : requiredLevel;
    
    return userLevelObj && requiredLevelObj && userLevelObj.level >= requiredLevelObj.level;
  }

  /**
   * Definir permissão para usuário
   */
  setUserPermission(guildId, userId, resource, resourceType, allowed, reason = '', options = {}) {
    const guildConfig = this.getGuildConfig(guildId);
    
    if (!guildConfig.permissions.users[userId]) {
      guildConfig.permissions.users[userId] = {};
    }
    
    if (!guildConfig.permissions.users[userId][resourceType]) {
      guildConfig.permissions.users[userId][resourceType] = {};
    }

    guildConfig.permissions.users[userId][resourceType][resource] = {
      allowed,
      reason,
      grantedBy: options.grantedBy || 'system',
      grantedAt: new Date().toISOString(),
      expiresAt: options.expiresAt || null
    };

    // Adicionar ao audit log
    this.addToAuditLog({
      action: 'set_user_permission',
      guildId,
      userId,
      resource,
      resourceType,
      allowed,
      reason,
      grantedBy: options.grantedBy
    });

    this.clearCache();
    return this.saveConfig();
  }

  /**
   * Definir permissão para cargo
   */
  setRolePermission(guildId, roleId, resource, resourceType, allowed, reason = '', options = {}) {
    const guildConfig = this.getGuildConfig(guildId);
    
    if (!guildConfig.permissions.roles[roleId]) {
      guildConfig.permissions.roles[roleId] = {};
    }
    
    if (!guildConfig.permissions.roles[roleId][resourceType]) {
      guildConfig.permissions.roles[roleId][resourceType] = {};
    }

    guildConfig.permissions.roles[roleId][resourceType][resource] = {
      allowed,
      reason,
      grantedBy: options.grantedBy || 'system',
      grantedAt: new Date().toISOString(),
      expiresAt: options.expiresAt || null
    };

    // Adicionar ao audit log
    this.addToAuditLog({
      action: 'set_role_permission',
      guildId,
      roleId,
      resource,
      resourceType,
      allowed,
      reason,
      grantedBy: options.grantedBy
    });

    this.clearCache();
    return this.saveConfig();
  }

  /**
   * Definir permissão temporária
   */
  setTemporaryPermission(guildId, userId, resource, resourceType, allowed, duration, reason = '', options = {}) {
    const guildConfig = this.getGuildConfig(guildId);
    
    if (!guildConfig.temporaryPermissions[userId]) {
      guildConfig.temporaryPermissions[userId] = [];
    }

    const tempPerm = {
      resource,
      resourceType,
      allowed,
      reason,
      grantedBy: options.grantedBy || 'system',
      grantedAt: new Date().toISOString(),
      expiresAt: Date.now() + duration
    };

    guildConfig.temporaryPermissions[userId].push(tempPerm);

    // Adicionar ao audit log
    this.addToAuditLog({
      action: 'set_temporary_permission',
      guildId,
      userId,
      resource,
      resourceType,
      allowed,
      duration,
      reason,
      grantedBy: options.grantedBy
    });

    this.clearCache();
    return this.saveConfig();
  }

  /**
   * Remover permissão
   */
  removePermission(guildId, targetId, resource, resourceType, targetType = 'user') {
    const guildConfig = this.getGuildConfig(guildId);
    
    if (targetType === 'user') {
      if (guildConfig.permissions.users[targetId]?.[resourceType]) {
        delete guildConfig.permissions.users[targetId][resourceType][resource];
      }
    } else if (targetType === 'role') {
      if (guildConfig.permissions.roles[targetId]?.[resourceType]) {
        delete guildConfig.permissions.roles[targetId][resourceType][resource];
      }
    }

    this.addToAuditLog({
      action: 'remove_permission',
      guildId,
      targetType,
      targetId,
      resource,
      resourceType
    });

    this.clearCache();
    return this.saveConfig();
  }

  /**
   * Aplicar template de permissão
   */
  applyTemplate(guildId, templateName, targetId, targetType = 'role') {
    const template = this.config.templates[templateName];
    if (!template) {
      throw new Error(`Template "${templateName}" não encontrado`);
    }

    const guildConfig = this.getGuildConfig(guildId);
    const permissions = template.permissions;

    if (targetType === 'role') {
      if (!guildConfig.permissions.roles[targetId]) {
        guildConfig.permissions.roles[targetId] = {};
      }
      
      // Aplicar nível
      if (permissions.level) {
        guildConfig.permissions.roles[targetId].level = permissions.level;
      }

      // Aplicar permissões de comando
      if (permissions.commands) {
        if (!guildConfig.permissions.roles[targetId].command) {
          guildConfig.permissions.roles[targetId].command = {};
        }
        
        permissions.commands.forEach(cmd => {
          guildConfig.permissions.roles[targetId].command[cmd] = {
            allowed: true,
            reason: `Template: ${templateName}`
          };
        });
      }
    }

    this.addToAuditLog({
      action: 'apply_template',
      guildId,
      templateName,
      targetId,
      targetType
    });

    this.clearCache();
    return this.saveConfig();
  }

  /**
   * Adicionar ao audit log
   */
  addToAuditLog(entry) {
    const logEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry
    };

    this.config.auditLog.unshift(logEntry);
    
    // Manter apenas os últimos 1000 registros
    if (this.config.auditLog.length > 1000) {
      this.config.auditLog = this.config.auditLog.slice(0, 1000);
    }
  }

  /**
   * Limpar cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Obter estatísticas de uso
   */
  getStatistics(guildId) {
    const guildConfig = this.getGuildConfig(guildId);
    
    return {
      users: Object.keys(guildConfig.permissions.users).length,
      roles: Object.keys(guildConfig.permissions.roles).length,
      channels: Object.keys(guildConfig.permissions.channels).length,
      categories: Object.keys(guildConfig.permissions.categories).length,
      temporaryPermissions: Object.keys(guildConfig.temporaryPermissions).length,
      auditLogEntries: this.config.auditLog.length,
      lastUpdated: guildConfig.metadata.lastUpdated
    };
  }

  /**
   * Exportar configuração
   */
  exportConfig(guildId = null) {
    if (guildId) {
      return this.getGuildConfig(guildId);
    }
    return this.config;
  }

  /**
   * Importar configuração
   */
  importConfig(config, guildId = null) {
    try {
      if (guildId) {
        this.validateAndRepairConfig(config);
        this.config.guilds[guildId] = config;
      } else {
        this.validateAndRepairConfig(config);
        this.config = config;
      }
      
      this.addToAuditLog({
        action: 'import_config',
        guildId,
        importedAt: new Date().toISOString()
      });

      this.clearCache();
      return this.saveConfig();
    } catch (error) {
      console.error('Erro ao importar configuração:', error);
      return false;
    }
  }
}

// Instância global
const permissionManager = new AdvancedPermissionManager();

module.exports = {
  permissionManager,
  PERMISSION_LEVELS,
  PERMISSION_TYPES,
  
  // Métodos de conveniência
  checkPermission: (member, guildId, resource, resourceType, options) => 
    permissionManager.checkPermission(member, guildId, resource, resourceType, options),
  
  setUserPermission: (guildId, userId, resource, resourceType, allowed, reason, options) =>
    permissionManager.setUserPermission(guildId, userId, resource, resourceType, allowed, reason, options),
  
  setRolePermission: (guildId, roleId, resource, resourceType, allowed, reason, options) =>
    permissionManager.setRolePermission(guildId, roleId, resource, resourceType, allowed, reason, options),
  
  setTemporaryPermission: (guildId, userId, resource, resourceType, allowed, duration, reason, options) =>
    permissionManager.setTemporaryPermission(guildId, userId, resource, resourceType, allowed, duration, reason, options),
  
  removePermission: (guildId, targetId, resource, resourceType, targetType) =>
    permissionManager.removePermission(guildId, targetId, resource, resourceType, targetType),
  
  applyTemplate: (guildId, templateName, targetId, targetType) =>
    permissionManager.applyTemplate(guildId, templateName, targetId, targetType),
  
  getGuildConfig: (guildId) => permissionManager.getGuildConfig(guildId),
  getStatistics: (guildId) => permissionManager.getStatistics(guildId),
  exportConfig: (guildId) => permissionManager.exportConfig(guildId),
  importConfig: (config, guildId) => permissionManager.importConfig(config, guildId),
  
  // Acesso direto à instância
  instance: permissionManager
};

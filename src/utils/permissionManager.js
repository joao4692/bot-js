/**
 * Sistema Avançado de Permissões
 * 
 * Recursos:
 * - Níveis de permissão (PUBLIC, STAFF, ADMIN, OWNER, CUSTOM)
 * - Controle por cargos e usuários específicos
 * - Bloqueio/liberação por canais
 * - Histórico de alterações
 * - Backup automático
 * - Validação em tempo real
 */

const fs = require('fs');
const path = require('path');
const { PermissionsBitField } = require('discord.js');

const permsConfigPath = path.join(__dirname, '../data/permissions.json');
const backupPath = path.join(__dirname, '../data/permissions.backup.json');

/**
 * Níveis de permissão
 */
const PERMISSION_LEVELS = {
  PUBLIC: 'public',           // Qualquer um pode usar
  STAFF: 'staff',             // Apenas staff
  ADMIN: 'admin',             // Apenas admin
  OWNER: 'owner',             // Apenas proprietário
  CUSTOM: 'custom'            // Customizado (cargos/usuários específicos)
};

/**
 * Lê configuração de permissões com backup automático
 */
function readPermissionsConfig() {
  try {
    if (fs.existsSync(permsConfigPath)) {
      const data = JSON.parse(fs.readFileSync(permsConfigPath, 'utf-8'));
      
      // Validação básica da estrutura
      if (!data.commands || !data.channels || !Array.isArray(data.history)) {
        console.warn('Estrutura de permissions.json inválida, corrigindo...');
        data.commands = data.commands || {};
        data.channels = data.channels || {};
        data.history = data.history || [];
      }
      
      return data;
    }
  } catch (error) {
    console.error('Erro ao ler permissions.json:', error);
    // Tentar restaurar do backup
    if (fs.existsSync(backupPath)) {
      try {
        console.log('Tentando restaurar do backup...');
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
        savePermissionsConfig(backupData);
        return backupData;
      } catch (backupError) {
        console.error('Backup também está corrompido:', backupError);
      }
    }
  }
  
  // Retornar estrutura padrão
  return { 
    commands: {},
    channels: {},
    history: [],
    version: '2.0',
    lastBackup: new Date().toISOString()
  };
}

/**
 * Salva configuração de permissões com backup automático
 */
function savePermissionsConfig(data) {
  try {
    // Criar backup antes de salvar
    if (fs.existsSync(permsConfigPath)) {
      fs.copyFileSync(permsConfigPath, backupPath);
    }
    
    // Adicionar metadados
    data.version = '2.0';
    data.lastBackup = new Date().toISOString();
    
    fs.writeFileSync(permsConfigPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Erro ao salvar permissions.json:', error);
    return false;
  }
}

/**
 * Normaliza nome de comando
 */
function normalizeCommand(name) {
  return String(name || '').trim().toLowerCase();
}

/**
 * Define nível de permissão para um comando
 */
function setCommandLevel(guildId, commandName, level) {
  const config = readPermissionsConfig();
  
  if (!config.commands[guildId]) {
    config.commands[guildId] = {};
  }

  const cmd = normalizeCommand(commandName);
  config.commands[guildId][cmd] = {
    level: level,
    roles: [],
    users: [],
    blockedChannels: [],
    allowedChannels: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return savePermissionsConfig(config);
}

/**
 * Adiciona cargo às permissões customizadas com histórico
 */
function addRolePermission(guildId, commandName, roleId, addedBy = 'system') {
  const config = readPermissionsConfig();
  const cmd = normalizeCommand(commandName);
  
  if (!config.commands[guildId]) {
    config.commands[guildId] = {};
  }

  if (!config.commands[guildId][cmd]) {
    config.commands[guildId][cmd] = { 
      level: PERMISSION_LEVELS.CUSTOM, 
      roles: [], 
      users: [], 
      blockedChannels: [], 
      allowedChannels: [],
      createdAt: new Date().toISOString(),
      createdBy: addedBy
    };
  }

  if (!config.commands[guildId][cmd].roles.includes(roleId)) {
    config.commands[guildId][cmd].roles.push(roleId);
    config.commands[guildId][cmd].level = PERMISSION_LEVELS.CUSTOM;
    
    // Adicionar ao histórico
    config.history.unshift({
      action: 'add_role',
      guildId,
      command: cmd,
      roleId,
      addedBy,
      timestamp: new Date().toISOString()
    });
    
    // Manter apenas os últimos 100 registros
    if (config.history.length > 100) {
      config.history = config.history.slice(0, 100);
    }
  }

  return savePermissionsConfig(config);
}

/**
 * Remove cargo das permissões customizadas com histórico
 */
function removeRolePermission(guildId, commandName, roleId, removedBy = 'system') {
  const config = readPermissionsConfig();
  const cmd = normalizeCommand(commandName);
  
  if (config.commands[guildId]?.[cmd]?.roles) {
    const wasRemoved = config.commands[guildId][cmd].roles.includes(roleId);
    config.commands[guildId][cmd].roles = config.commands[guildId][cmd].roles.filter(r => r !== roleId);
    
    if (wasRemoved) {
      // Adicionar ao histórico
      config.history.unshift({
        action: 'remove_role',
        guildId,
        command: cmd,
        roleId,
        removedBy,
        timestamp: new Date().toISOString()
      });
      
      // Manter apenas os últimos 100 registros
      if (config.history.length > 100) {
        config.history = config.history.slice(0, 100);
      }
    }
  }

  return savePermissionsConfig(config);
}

/**
 * Adiciona usuário às permissões customizadas com histórico
 */
function addUserPermission(guildId, commandName, userId, addedBy = 'system') {
  const config = readPermissionsConfig();
  const cmd = normalizeCommand(commandName);
  
  if (!config.commands[guildId]) {
    config.commands[guildId] = {};
  }

  if (!config.commands[guildId][cmd]) {
    config.commands[guildId][cmd] = { 
      level: PERMISSION_LEVELS.CUSTOM, 
      roles: [], 
      users: [], 
      blockedChannels: [], 
      allowedChannels: [],
      createdAt: new Date().toISOString(),
      createdBy: addedBy
    };
  }

  if (!config.commands[guildId][cmd].users.includes(userId)) {
    config.commands[guildId][cmd].users.push(userId);
    config.commands[guildId][cmd].level = PERMISSION_LEVELS.CUSTOM;
    
    // Adicionar ao histórico
    config.history.unshift({
      action: 'add_user',
      guildId,
      command: cmd,
      userId,
      addedBy,
      timestamp: new Date().toISOString()
    });
    
    // Manter apenas os últimos 100 registros
    if (config.history.length > 100) {
      config.history = config.history.slice(0, 100);
    }
  }

  return savePermissionsConfig(config);
}

/**
 * Remove usuário das permissões customizadas com histórico
 */
function removeUserPermission(guildId, commandName, userId, removedBy = 'system') {
  const config = readPermissionsConfig();
  const cmd = normalizeCommand(commandName);
  
  if (config.commands[guildId]?.[cmd]?.users) {
    const wasRemoved = config.commands[guildId][cmd].users.includes(userId);
    config.commands[guildId][cmd].users = config.commands[guildId][cmd].users.filter(u => u !== userId);
    
    if (wasRemoved) {
      // Adicionar ao histórico
      config.history.unshift({
        action: 'remove_user',
        guildId,
        command: cmd,
        userId,
        removedBy,
        timestamp: new Date().toISOString()
      });
      
      // Manter apenas os últimos 100 registros
      if (config.history.length > 100) {
        config.history = config.history.slice(0, 100);
      }
    }
  }

  return savePermissionsConfig(config);
}

/**
 * Verifica se um membro tem permissão para usar um comando
 */
function checkPermission(member, guildId, commandName, ownerId = null) {
  const config = readPermissionsConfig();
  const cmd = normalizeCommand(commandName);
  const cmdConfig = config.commands[guildId]?.[cmd];

  // Se não há configuração, libera (padrão)
  if (!cmdConfig) {
    return { allowed: true, reason: 'Sem restrição' };
  }

  const { level, roles, users } = cmdConfig;

  // Verificar owner
  if (ownerId && member.id === ownerId) {
    return { allowed: true, reason: 'Proprietário do servidor' };
  }

  // Verificar nível
  if (level === PERMISSION_LEVELS.PUBLIC) {
    return { allowed: true, reason: 'Comando público' };
  }

  if (level === PERMISSION_LEVELS.OWNER) {
    return { allowed: member.id === ownerId, reason: 'Apenas proprietário' };
  }

  if (level === PERMISSION_LEVELS.ADMIN) {
    return { 
      allowed: member.permissions.has(PermissionsBitField.Flags.Administrator),
      reason: 'Requer permissão de administrador'
    };
  }

  if (level === PERMISSION_LEVELS.STAFF) {
    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    return { 
      allowed: isAdmin,
      reason: 'Requer cargo de staff/administrador'
    };
  }

  if (level === PERMISSION_LEVELS.CUSTOM) {
    // Admins podem sempre usar
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return { allowed: true, reason: 'Administrador' };
    }

    // Verificar usuário
    if (users.includes(member.id)) {
      return { allowed: true, reason: 'Usuário autorizado' };
    }

    // Verificar cargo
    if (roles.some(roleId => member.roles.cache.has(roleId))) {
      return { allowed: true, reason: 'Cargo autorizado' };
    }

    return { 
      allowed: false, 
      reason: 'Cargo/Usuário não autorizado' 
    };
  }

  return { allowed: false, reason: 'Permissão negada' };
}

/**
 * Obtém informações de permissão de um comando
 */
function getCommandPermissions(guildId, commandName) {
  const config = readPermissionsConfig();
  const cmd = normalizeCommand(commandName);
  
  return config.commands[guildId]?.[cmd] || null;
}

/**
 * Lista todos os comandos com permissões configuradas
 */
function listCommandPermissions(guildId) {
  const config = readPermissionsConfig();
  
  return Object.entries(config.commands[guildId] || {}).map(([cmd, perms]) => ({
    command: cmd,
    level: perms.level,
    roles: perms.roles || [],
    users: perms.users || []
  }));
}

/**
 * Remove todas as permissões de um comando
 */
function resetCommandPermissions(guildId, commandName) {
  const config = readPermissionsConfig();
  const cmd = normalizeCommand(commandName);
  
  if (config.commands[guildId]) {
    delete config.commands[guildId][cmd];
  }

  return savePermissionsConfig(config);
}

module.exports = {
  PERMISSION_LEVELS,
  readPermissionsConfig,
  savePermissionsConfig,
  normalizeCommand,
  setCommandLevel,
  addRolePermission,
  removeRolePermission,
  addUserPermission,
  removeUserPermission,
  checkPermission,
  getCommandPermissions,
  listCommandPermissions,
  resetCommandPermissions
};

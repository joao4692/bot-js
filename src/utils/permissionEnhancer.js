/**
 * Utilitários Avançados para Sistema de Permissões
 * 
 * Funcionalidades adicionais:
 * - Validação em lote
 * - Relatórios detalhados
 * - Importação/Exportação
 * - Auditoria de segurança
 */

const { checkPermission, PERMISSION_LEVELS, listCommandPermissions } = require('./permissionManager');
const { EmbedBuilder } = require('discord.js');

/**
 * Valida múltiplos comandos para um usuário
 */
function validateMultipleCommands(member, guildId, commands, ownerId = null) {
  const results = {};
  
  commands.forEach(commandName => {
    const permission = checkPermission(member, guildId, commandName, ownerId);
    results[commandName] = {
      allowed: permission.allowed,
      reason: permission.reason
    };
  });
  
  return {
    total: commands.length,
    allowed: Object.values(results).filter(r => r.allowed).length,
    denied: Object.values(results).filter(r => !r.allowed).length,
    results
  };
}

/**
 * Gera relatório detalhado de permissões do servidor
 */
function generatePermissionReport(guildId, client) {
  const commands = listCommandPermissions(guildId);
  
  const report = {
    serverId: guildId,
    totalCommands: commands.length,
    publicCommands: commands.filter(c => c.level === PERMISSION_LEVELS.PUBLIC).length,
    adminCommands: commands.filter(c => c.level === PERMISSION_LEVELS.ADMIN).length,
    customCommands: commands.filter(c => c.level === PERMISSION_LEVELS.CUSTOM).length,
    commands: commands.map(cmd => ({
      name: cmd.command,
      level: cmd.level,
      roles: cmd.roles?.length || 0,
      users: cmd.users?.length || 0,
      blockedChannels: cmd.blockedChannels?.length || 0,
      allowedChannels: cmd.allowedChannels?.length || 0
    }))
  };
  
  return report;
}

/**
 * Cria embed visual do relatório de permissões
 */
function createPermissionEmbedReport(report, guild) {
  const embed = new EmbedBuilder()
    .setColor('#3498db')
    .setTitle('📊 Relatório de Permissões')
    .setThumbnail(guild.iconURL())
    .addFields(
      { name: '📈 Total de Comandos', value: report.totalCommands.toString(), inline: true },
      { name: '🌍 Públicos', value: report.publicCommands.toString(), inline: true },
      { name: '👑 Admin', value: report.adminCommands.toString(), inline: true },
      { name: '⚙️ Customizados', value: report.customCommands.toString(), inline: true }
    )
    .setTimestamp()
    .setFooter({ text: `Servidor: ${guild.name}` });
  
  // Adicionar detalhes dos comandos customizados
  const customCommands = report.commands.filter(c => c.level === PERMISSION_LEVELS.CUSTOM);
  if (customCommands.length > 0) {
    embed.addFields({
      name: '🔧 Comandos Customizados',
      value: customCommands.map(cmd => 
        `\`${cmd.name}\` - ${cmd.roles} cargos, ${cmd.users} usuários`
      ).join('\n').substring(0, 1024)
    });
  }
  
  return embed;
}

/**
 * Verifica segurança das permissões (auditoria)
 */
function auditPermissions(guildId, client) {
  const commands = listCommandPermissions(guildId);
  const issues = [];
  const warnings = [];
  
  commands.forEach(cmd => {
    // Verificar comandos admin sem restrições
    if (cmd.level === PERMISSION_LEVELS.ADMIN && (!cmd.roles || cmd.roles.length === 0)) {
      warnings.push(`Comando admin \`${cmd.command}\` sem restrições específicas`);
    }
    
    // Verificar comandos custom sem ninguém permitido
    if (cmd.level === PERMISSION_LEVELS.CUSTOM && 
        (!cmd.roles || cmd.roles.length === 0) && 
        (!cmd.users || cmd.users.length === 0)) {
      issues.push(`Comando custom \`${cmd.command}\` não tem ninguém permitido`);
    }
    
    // Verificar muitos bloqueios de canal
    if (cmd.blockedChannels && cmd.blockedChannels.length > 10) {
      warnings.push(`Comando \`${cmd.command}\` bloqueado em muitos canais (${cmd.blockedChannels.length})`);
    }
  });
  
  return {
    healthy: issues.length === 0,
    issues,
    warnings,
    total: commands.length
  };
}

/**
 * Exporta configurações de permissões para JSON
 */
function exportPermissions(guildId) {
  const commands = listCommandPermissions(guildId);
  
  return {
    exportedAt: new Date().toISOString(),
    guildId,
    commands: commands,
    version: '2.0'
  };
}

/**
 * Importa configurações de permissões
 */
function importPermissions(guildId, data, overwrite = false) {
  const { setCommandLevel, addRolePermission, addUserPermission } = require('./permissionManager');
  const results = { imported: 0, skipped: 0, errors: [] };
  
  if (!data.commands || !Array.isArray(data.commands)) {
    throw new Error('Dados de importação inválidos');
  }
  
  data.commands.forEach(cmd => {
    try {
      if (!cmd.command) {
        results.skipped++;
        return;
      }
      
      // Verificar se já existe e não deve sobrescrever
      const existing = listCommandPermissions(guildId).find(c => c.command === cmd.command);
      if (existing && !overwrite) {
        results.skipped++;
        return;
      }
      
      // Importar nível
      if (cmd.level && Object.values(PERMISSION_LEVELS).includes(cmd.level)) {
        setCommandLevel(guildId, cmd.command, cmd.level, 'import');
      }
      
      // Importar cargos
      if (cmd.roles && Array.isArray(cmd.roles)) {
        cmd.roles.forEach(roleId => {
          addRolePermission(guildId, cmd.command, roleId, 'import');
        });
      }
      
      // Importar usuários
      if (cmd.users && Array.isArray(cmd.users)) {
        cmd.users.forEach(userId => {
          addUserPermission(guildId, cmd.command, userId, 'import');
        });
      }
      
      results.imported++;
    } catch (error) {
      results.errors.push(`Erro ao importar ${cmd.command}: ${error.message}`);
    }
  });
  
  return results;
}

/**
 * Limpa permissões órfãs (de comandos que não existem mais)
 */
function cleanupOrphanedPermissions(guildId, client) {
  const commands = listCommandPermissions(guildId);
  const existingCommandNames = client.slashCommands ? 
    Array.from(client.slashCommands.keys()) : [];
  
  const orphaned = commands.filter(cmd => 
    !existingCommandNames.includes(cmd.command)
  );
  
  const { resetCommandPermissions } = require('./permissionManager');
  const cleaned = [];
  
  orphaned.forEach(cmd => {
    try {
      resetCommandPermissions(guildId, cmd.command);
      cleaned.push(cmd.command);
    } catch (error) {
      console.error(`Erro ao limpar permissão órfã ${cmd.command}:`, error);
    }
  });
  
  return {
    totalCommands: commands.length,
    existingCommands: existingCommandNames.length,
    orphanedFound: orphaned.length,
    cleaned,
    remaining: commands.length - cleaned.length
  };
}

module.exports = {
  validateMultipleCommands,
  generatePermissionReport,
  createPermissionEmbedReport,
  auditPermissions,
  exportPermissions,
  importPermissions,
  cleanupOrphanedPermissions
};

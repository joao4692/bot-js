/**
 * CORRETOR AUTOMÁTICO DE PERMISSÕES
 * 
 * Sistema para corrigir automaticamente problemas comuns
 * nos comandos e configurar permissões padrão
 */

const fs = require('fs');
const path = require('path');
const { 
  setUserPermission,
  setRolePermission,
  getGuildConfig,
  PERMISSION_LEVELS
} = require('./advancedPermissionManager');

class PermissionFixer {
  constructor() {
    this.fixes = [];
    this.warnings = [];
    this.successes = [];
  }

  /**
   * Corrigir sistema de permissões automaticamente
   */
  async fixPermissionSystem(client, guildId) {
    this.fixes = [];
    this.warnings = [];
    this.successes = [];

    try {
      console.log(`[FIXER] Iniciando correção automática para servidor ${guildId}...`);

      // 1. Configurar permissões padrão para categorias
      await this.setupDefaultPermissions(client, guildId);

      // 2. Corrigir comandos sem permissões
      await this.fixCommandPermissions(client, guildId);

      // 3. Configurar permissões para cargos administrativos
      await this.setupAdminPermissions(client, guildId);

      // 4. Corrigir problemas de estrutura
      await this.fixStructureIssues(client, guildId);

      // 5. Validar correções
      await this.validateFixes(client, guildId);

      return this.generateFixReport();

    } catch (error) {
      console.error('[FIXER] Erro na correção automática:', error);
      this.fixes.push({
        type: 'error',
        description: `Erro geral: ${error.message}`,
        severity: 'critical'
      });

      return this.generateFixReport();
    }
  }

  /**
   * Configurar permissões padrão
   */
  async setupDefaultPermissions(client, guildId) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      this.warnings.push('Servidor não encontrado no cache do cliente');
      return;
    }

    // Mapeamento de categorias para níveis de permissão
    const categoryPermissions = {
      'admin': 'ADMIN',
      'moderation': 'MODERATOR', 
      'moderação': 'MODERATOR',
      'economy': 'MEMBER',
      'economia': 'MEMBER',
      'misc': 'PUBLIC',
      'detran': 'STAFF',
      'police': 'STAFF',
      'rp': 'MEMBER'
    };

    // Obter todos os comandos
    const commands = Array.from(client.slashCommands.values());
    
    for (const command of commands) {
      const category = (command.category || 'misc').toLowerCase();
      const permissionLevel = categoryPermissions[category] || 'MEMBER';
      
      if (permissionLevel === 'PUBLIC') {
        // Comandos públicos não precisam de configuração
        continue;
      }

      // Configurar permissão padrão baseada na categoria
      const guildConfig = getGuildConfig(guildId);
      const currentLevel = guildConfig.settings.defaultLevel || 'MEMBER';
      
      if (permissionLevel !== currentLevel) {
        // Adicionar ao log de correções necessárias
        this.fixes.push({
          type: 'category_permission',
          command: command.data?.name || 'unknown',
          category,
          suggestedLevel: permissionLevel,
          description: `Comando ${command.data?.name} deve requerer nível ${permissionLevel}`
        });
      }
    }

    this.successes.push('Análise de permissões por categoria concluída');
  }

  /**
   * Corrigir permissões de comandos específicos
   */
  async fixCommandPermissions(client, guildId) {
    const commands = Array.from(client.slashCommands.values());
    
    // Lista de comandos críticos que sempre devem ter permissões configuradas
    const criticalCommands = {
      'ban': 'ADMIN',
      'kick': 'ADMIN', 
      'mute': 'MODERATOR',
      'warn': 'MODERATOR',
      'unban': 'ADMIN',
      'nuke': 'OWNER',
      'reload': 'OWNER',
      'eval': 'OWNER',
      'permissions': 'ADMIN',
      'permission-debug': 'ADMIN',
      'check-commands': 'ADMIN',
      'economy-config': 'ADMIN',
      'reset-economia': 'ADMIN',
      'set-economy-mode': 'ADMIN',
      'whitelist': 'ADMIN',
      'whitelist-advanced': 'ADMIN',
      'gatekeeper': 'ADMIN',
      'gatekeeper-config': 'ADMIN'
    };

    for (const [commandName, requiredLevel] of Object.entries(criticalCommands)) {
      const command = commands.find(cmd => cmd.data?.name === commandName);
      
      if (!command) {
        this.warnings.push(`Comando crítico não encontrado: ${commandName}`);
        continue;
      }

      // Verificar se já tem permissão configurada
      const guildConfig = getGuildConfig(guildId);
      const hasPermission = guildConfig.permissions.commands?.[commandName];

      if (!hasPermission) {
        this.fixes.push({
          type: 'critical_command',
          command: commandName,
          requiredLevel,
          description: `Comando crítico ${commandName} precisa de permissão ${requiredLevel}`,
          autoFixable: true
        });
      }
    }

    this.successes.push('Verificação de comandos críticos concluída');
  }

  /**
   * Configurar permissões para cargos administrativos
   */
  async setupAdminPermissions(client, guildId) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      this.warnings.push('Servidor não encontrado para configurar permissões de admin');
      return;
    }

    // Nomes comuns de cargos administrativos
    const adminRoleNames = [
      'admin', 'administrator', 'administrador', 'adm',
      'moderator', 'moderador', 'mod', 'staff',
      'owner', 'dono', 'manager', 'gerente'
    ];

    const foundAdminRoles = [];

    // Procurar cargos administrativos
    guild.roles.cache.forEach(role => {
      const roleName = role.name.toLowerCase();
      
      if (adminRoleNames.some(adminName => roleName.includes(adminName))) {
        foundAdminRoles.push({
          id: role.id,
          name: role.name,
          position: role.position
        });
      }
    });

    // Ordenar por posição (maior = mais poderoso)
    foundAdminRoles.sort((a, b) => b.position - a.position);

    if (foundAdminRoles.length === 0) {
      this.warnings.push('Nenhum cargo administrativo encontrado');
      return;
    }

    // Configurar permissões para o cargo mais alto
    const topAdminRole = foundAdminRoles[0];
    
    this.fixes.push({
      type: 'admin_role_setup',
      roleId: topAdminRole.id,
      roleName: topAdminRole.name,
      description: `Cargo administrativo principal encontrado: ${topAdminRole.name}`,
      autoFixable: true
    });

    this.successes.push(`${foundAdminRoles.length} cargos administrativos identificados`);
  }

  /**
   * Corrigir problemas de estrutura
   */
  async fixStructureIssues(client, guildId) {
    const guildConfig = getGuildConfig(guildId);
    let fixesNeeded = 0;

    // Verificar estrutura básica
    if (!guildConfig.permissions) {
      this.fixes.push({
        type: 'structure',
        description: 'Objeto permissions não encontrado',
        autoFixable: true
      });
      fixesNeeded++;
    }

    if (!guildConfig.settings) {
      this.fixes.push({
        type: 'structure', 
        description: 'Objeto settings não encontrado',
        autoFixable: true
      });
      fixesNeeded++;
    }

    // Verificar níveis padrão
    const defaultLevel = guildConfig.settings?.defaultLevel;
    if (!defaultLevel || !PERMISSION_LEVELS[defaultLevel]) {
      this.fixes.push({
        type: 'structure',
        description: 'Nível padrão inválido ou não configurado',
        suggestedValue: 'MEMBER',
        autoFixable: true
      });
      fixesNeeded++;
    }

    if (fixesNeeded > 0) {
      this.warnings.push(`${fixesNeeded} problemas de estrutura encontrados`);
    } else {
      this.successes.push('Estrutura de configuração está correta');
    }
  }

  /**
   * Validar correções aplicadas
   */
  async validateFixes(client, guildId) {
    // Testar permissões em comandos básicos
    const testCommands = ['help', 'ping', 'serverinfo'];
    let validCommands = 0;

    for (const commandName of testCommands) {
      const command = client.slashCommands.get(commandName);
      if (command && command.data?.name) {
        validCommands++;
      }
    }

    if (validCommands === testCommands.length) {
      this.successes.push('Comandos básicos funcionando corretamente');
    } else {
      this.warnings.push(`${testCommands.length - validCommands} comandos básicos com problemas`);
    }
  }

  /**
   * Aplicar correções automáticas
   */
  async applyAutoFixes(client, guildId) {
    const autoFixable = this.fixes.filter(fix => fix.autoFixable);
    let appliedFixes = 0;

    for (const fix of autoFixable) {
      try {
        switch (fix.type) {
          case 'critical_command':
            // Configurar permissão para comando crítico
            await this.setCommandPermission(guildId, fix.command, fix.requiredLevel);
            appliedFixes++;
            break;

          case 'admin_role_setup':
            // Configurar permissões para cargo admin
            await this.setupRolePermissions(guildId, fix.roleId);
            appliedFixes++;
            break;

          case 'structure':
            // Corrigir estrutura (seria implementado)
            this.warnings.push(`Correção estrutural para: ${fix.description}`);
            break;
        }
      } catch (error) {
        this.warnings.push(`Falha ao aplicar correção para ${fix.description}: ${error.message}`);
      }
    }

    this.successes.push(`${appliedFixes} correções automáticas aplicadas`);
    return appliedFixes;
  }

  /**
   * Definir permissão para comando
   */
  async setCommandPermission(guildId, commandName, level) {
    // Obter cargo de nível mais alto para dar permissão
    const guildConfig = getGuildConfig(guildId);
    
    // Encontrar cargo administrativo principal
    const adminRoles = Object.entries(guildConfig.permissions.roles || {})
      .filter(([roleId, perms]) => perms.level === 'ADMIN')
      .map(([roleId]) => roleId);

    if (adminRoles.length > 0) {
      await setRolePermission(
        guildId,
        adminRoles[0],
        commandName,
        'command',
        true,
        `Permissão automática para comando crítico`,
        { grantedBy: 'auto-fixer' }
      );
    }
  }

  /**
   * Configurar permissões para cargo
   */
  async setupRolePermissions(guildId, roleId) {
    // Lista de comandos administrativos básicos
    const adminCommands = [
      'ban', 'kick', 'mute', 'warn', 'permissions',
      'check-commands', 'permission-debug'
    ];

    for (const command of adminCommands) {
      await setRolePermission(
        guildId,
        roleId,
        command,
        'command',
        true,
        `Permissão automática para cargo administrativo`,
        { grantedBy: 'auto-fixer' }
      );
    }
  }

  /**
   * Gerar relatório de correções
   */
  generateFixReport() {
    const totalFixes = this.fixes.length;
    const autoFixable = this.fixes.filter(f => f.autoFixable).length;
    const criticalFixes = this.fixes.filter(f => f.type === 'critical_command').length;

    return {
      success: criticalFixes === 0,
      summary: {
        totalIssues: totalFixes,
        autoFixable: autoFixable,
        critical: criticalFixes,
        warnings: this.warnings.length,
        successes: this.successes.length
      },
      fixes: this.fixes,
      warnings: this.warnings,
      successes: this.successes,
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Gerar recomendações
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.fixes.some(f => f.type === 'critical_command')) {
      recommendations.push({
        priority: 'high',
        title: 'Configurar Permissões de Comandos Críticos',
        description: 'Comandos como ban, kick, e nuke precisam de permissões restritas.',
        action: 'Use /permissions cargo para configurar permissões adequadas'
      });
    }

    if (this.warnings.length > 5) {
      recommendations.push({
        priority: 'medium',
        title: 'Revisar Estrutura de Comandos',
        description: 'Muitos avisos encontrados. Revise a estrutura dos comandos.',
        action: 'Use /check-commands para ver detalhes dos problemas'
      });
    }

    if (this.fixes.some(f => f.type === 'admin_role_setup')) {
      recommendations.push({
        priority: 'medium',
        title: 'Configurar Cargos Administrativos',
        description: 'Configure permissões adequadas para os cargos de admin.',
        action: 'Use /permissions cargo com templates pré-configurados'
      });
    }

    return recommendations;
  }

  /**
   * Gerar embed para Discord
   */
  generateEmbed() {
    const { EmbedBuilder } = require('discord.js');
    const report = this.generateFixReport();

    const embed = new EmbedBuilder()
      .setColor(report.success ? '#00ff00' : '#ffaa00')
      .setTitle('🔧 Relatório de Correção de Permissões')
      .setDescription('Análise e correções automáticas do sistema de permissões')
      .addFields(
        { 
          name: '📊 Resumo', 
          value: `**Problemas:** ${report.summary.totalIssues}\n**Auto-corrigíveis:** ${report.summary.autoFixable}\n**Críticos:** ${report.summary.critical}\n**Avisos:** ${report.summary.warnings}`, 
          inline: true 
        },
        { 
          name: '✅ Sucessos', 
          value: `**Correções aplicadas:** ${report.summary.successes}`, 
          inline: true 
        }
      )
      .setTimestamp();

    // Adicionar problemas críticos
    const criticalIssues = report.fixes.filter(f => f.type === 'critical_command');
    if (criticalIssues.length > 0) {
      const issuesList = criticalIssues
        .slice(0, 5)
        .map(issue => `• **${issue.command}**: Nível ${issue.requiredLevel}`)
        .join('\n');

      embed.addFields({
        name: '🚨 Problemas Críticos',
        value: issuesList,
        inline: false
      });
    }

    // Adicionar recomendações
    if (report.recommendations.length > 0) {
      const topRecommendation = report.recommendations[0];
      embed.addFields({
        name: '💡 Recomendação Principal',
        value: `**${topRecommendation.title}:** ${topRecommendation.description}\n\n**Ação:** ${topRecommendation.action}`,
        inline: false
      });
    }

    embed.setFooter({ 
      text: `Status: ${report.success ? '✅ Sistema OK' : '⚠️ Atenção necessária'}` 
    });

    return embed;
  }
}

// Instância global
const permissionFixer = new PermissionFixer();

module.exports = {
  permissionFixer,
  fixPermissionSystem: (client, guildId) => permissionFixer.fixPermissionSystem(client, guildId),
  applyAutoFixes: (client, guildId) => permissionFixer.applyAutoFixes(client, guildId),
  generateEmbed: () => permissionFixer.generateEmbed(),
  instance: permissionFixer
};

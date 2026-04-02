/**
 * MIDDLEWARE DE PERMISSÕES AVANÇADO
 * 
 * Sistema de middleware para validação automática de permissões
 * em todos os comandos e interações do bot.
 */

const { checkPermission } = require('./advancedPermissionManager');
const { checkPermission: checkLegacyPermission } = require('./permissionManager');
const { EmbedBuilder } = require('discord.js');

/**
 * Middleware principal de verificação de permissões
 */
class PermissionMiddleware {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60 * 1000; // 1 minuto
  }

  /**
   * Verificar permissão com cache
   */
  async checkPermission(member, guildId, resource, resourceType = 'command', options = {}) {
    const normalizedResource = String(resource || '').trim().toLowerCase();
    const cacheKey = `${guildId}_${member.id}_${resource}_${resourceType}_${options.channelId || 'global'}`;
    
    // Verificar cache
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.result;
    }

    // Realizar verificação
    const v3Result = checkPermission(member, guildId, normalizedResource, resourceType, options);

    // Compatibilidade: aplicar regras do sistema legado (permissions.json v2)
    // quando houver configuração para o comando.
    let legacyResult = { allowed: true };
    if (resourceType === 'command') {
      try {
        legacyResult = checkLegacyPermission(member, guildId, normalizedResource, member.guild?.ownerId);
      } catch (_) {
        legacyResult = { allowed: true };
      }
    }

    const result = legacyResult.allowed ? v3Result : {
      allowed: false,
      reason: legacyResult.reason || 'Cargo/Usuário não autorizado',
      source: 'legacy'
    };

    // Salvar no cache
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Middleware para comandos slash
   */
  async slashCommandMiddleware(interaction, client) {
    try {
      // Pular verificação para comandos de permissão (evitar recursão)
      if (interaction.commandName === 'permissions' || 
          interaction.commandName === 'permission-debug') {
        return { allowed: true };
      }

      // Montar chave do comando considerando subcomandos (ex: "mandado emitir")
      let resource = interaction.commandName;
      try {
        const subcommandGroup = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand(false);
        if (subcommandGroup) resource = `${resource} ${subcommandGroup}`;
        if (subcommand) resource = `${resource} ${subcommand}`;
      } catch (_) {
        // Ignorar se não houver subcomandos
      }

      resource = String(resource || '').trim().toLowerCase();

      // Verificar permissão
      const permCheck = await this.checkPermission(
        interaction.member,
        interaction.guildId,
        resource,
        'command',
        { channelId: interaction.channelId }
      );

      // Log de tentativa de acesso
      if (!permCheck.allowed) {
        console.log(`[PERMISSIONS] Acesso negado: ${interaction.user.tag} tentou usar /${resource} em ${interaction.guild.name}`);
        console.log(`[PERMISSIONS] Motivo: ${permCheck.reason} | Fonte: ${permCheck.source}`);
      }

      return permCheck;
    } catch (error) {
      console.error('[PERMISSIONS] Erro no middleware:', error);
      return { allowed: false, reason: 'Erro ao verificar permissão' };
    }
  }

  /**
   * Middleware para componentes (botões, menus, etc.)
   */
  async componentMiddleware(interaction, client) {
    try {
      // Extrair informação do customId
      const customId = interaction.customId;
      const resource = this.extractResourceFromCustomId(customId);
      
      if (!resource) {
        return { allowed: true }; // Sem restrição se não conseguir extrair
      }

      const permCheck = await this.checkPermission(
        interaction.member,
        interaction.guildId,
        resource,
        'component',
        { channelId: interaction.channelId }
      );

      return permCheck;
    } catch (error) {
      console.error('[PERMISSIONS] Erro no middleware de componente:', error);
      return { allowed: false, reason: 'Erro ao verificar permissão' };
    }
  }

  /**
   * Middleware para modais
   */
  async modalMiddleware(interaction, client) {
    try {
      const customId = interaction.customId;
      const resource = this.extractResourceFromCustomId(customId);
      
      if (!resource) {
        return { allowed: true };
      }

      const permCheck = await this.checkPermission(
        interaction.member,
        interaction.guildId,
        resource,
        'modal',
        { channelId: interaction.channelId }
      );

      return permCheck;
    } catch (error) {
      console.error('[PERMISSIONS] Erro no middleware de modal:', error);
      return { allowed: false, reason: 'Erro ao verificar permissão' };
    }
  }

  /**
   * Extrair recurso do customId
   */
  extractResourceFromCustomId(customId) {
    // Padrões comuns de customId
    const patterns = [
      /^(\w+)_/, // prefixo_comando
      /^(\w+)_\d+/, // prefixo_id
      /^(\w+)_modal/, // prefixo_modal
      /^(\w+)_button/, // prefixo_button
      /^(\w+)_menu/ // prefixo_menu
    ];

    for (const pattern of patterns) {
      const match = customId.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Criar embed de permissão negada
   */
  createDeniedEmbed(permCheck, commandName) {
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('❌ Sem Permissão')
      .setDescription(permCheck.reason || 'Você não tem permissão para usar este comando.')
      .addFields(
        { name: '📋 Comando', value: `/${commandName}`, inline: true },
        { name: '🔍 Fonte', value: permCheck.source || 'Desconhecida', inline: true }
      );

    if (permCheck.expiresAt) {
      embed.addFields({
        name: '⏰ Expira em',
        value: `<t:${Math.floor(permCheck.expiresAt / 1000)}:R>`,
        inline: true
      });
    }

    embed.setFooter({ 
      text: 'Se você acredita que isso é um erro, contate um administrador.' 
    });

    return embed;
  }

  /**
   * Limpar cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Obter estatísticas do cache
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout
    };
  }
}

// Instância global
const permissionMiddleware = new PermissionMiddleware();

module.exports = {
  permissionMiddleware,
  
  // Funções de conveniência
  checkPermission: (member, guildId, resource, resourceType, options) =>
    permissionMiddleware.checkPermission(member, guildId, resource, resourceType, options),
  
  slashCommandMiddleware: (interaction, client) =>
    permissionMiddleware.slashCommandMiddleware(interaction, client),
  
  componentMiddleware: (interaction, client) =>
    permissionMiddleware.componentMiddleware(interaction, client),
  
  modalMiddleware: (interaction, client) =>
    permissionMiddleware.modalMiddleware(interaction, client),
  
  createDeniedEmbed: (permCheck, commandName) =>
    permissionMiddleware.createDeniedEmbed(permCheck, commandName),
  
  clearCache: () => permissionMiddleware.clearCache(),
  getCacheStats: () => permissionMiddleware.getCacheStats(),
  
  // Acesso direto à instância
  instance: permissionMiddleware
};

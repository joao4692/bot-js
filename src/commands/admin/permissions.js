const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} = require('discord.js');
const { 
  permissionManager, 
  PERMISSION_LEVELS, 
  PERMISSION_TYPES,
  checkPermission,
  setUserPermission,
  setRolePermission,
  setTemporaryPermission,
  removePermission,
  applyTemplate,
  getGuildConfig,
  getStatistics,
  exportConfig,
  importConfig
} = require('../../utils/advancedPermissionManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('[ADMIN] Sistema avançado de gerenciamento de permissões')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('painel')
        .setDescription('Abrir painel de gerenciamento de permissões')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('usuario')
        .setDescription('Gerenciar permissões de usuário')
        .addUserOption(option =>
          option
            .setName('usuario')
            .setDescription('Usuário para gerenciar')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('acao')
            .setDescription('Ação a realizar')
            .addChoices(
              { name: '🔍 Ver Permissões', value: 'view' },
              { name: '✅ Conceder Permissão', value: 'grant' },
              { name: '❌ Revogar Permissão', value: 'revoke' },
              { name: '⏰ Conceder Temporária', value: 'temp' }
            )
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('comando')
            .setDescription('Comando específico (ou * para todos)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('motivo')
            .setDescription('Motivo da alteração')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('duracao')
            .setDescription('Duração (ex: 1h, 30m, 7d)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cargo')
        .setDescription('Gerenciar permissões de cargo')
        .addRoleOption(option =>
          option
            .setName('cargo')
            .setDescription('Cargo para gerenciar')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('acao')
            .setDescription('Ação a realizar')
            .addChoices(
              { name: '🔍 Ver Permissões', value: 'view' },
              { name: '✅ Conceder Permissão', value: 'grant' },
              { name: '❌ Revogar Permissão', value: 'revoke' },
              { name: '📋 Aplicar Template', value: 'template' }
            )
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('comando')
            .setDescription('Comando específico (ou * para todos)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('motivo')
            .setDescription('Motivo da alteração')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('template')
            .setDescription('Template para aplicar')
            .addChoices(
              { name: '👑 Administrador', value: 'admin' },
              { name: '🛡️ Moderador', value: 'moderator' },
              { name: '👥 Staff', value: 'staff' }
            )
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('canal')
        .setDescription('Gerenciar permissões de canal')
        .addChannelOption(option =>
          option
            .setName('canal')
            .setDescription('Canal para gerenciar')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('acao')
            .setDescription('Ação a realizar')
            .addChoices(
              { name: '🔍 Ver Permissões', value: 'view' },
              { name: '✅ Permitir Comando', value: 'allow' },
              { name: '❌ Bloquear Comando', value: 'deny' }
            )
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('comando')
            .setDescription('Comando específico (ou * para todos)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('estatisticas')
        .setDescription('Ver estatísticas do sistema de permissões')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('exportar')
        .setDescription('Exportar configuração de permissões')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('importar')
        .setDescription('Importar configuração de permissões')
        .addStringOption(option =>
          option
            .setName('config')
            .setDescription('JSON da configuração')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('audit')
        .setDescription('Ver log de auditoria')
        .addIntegerOption(option =>
          option
            .setName('limite')
            .setDescription('Número de entradas a mostrar')
            .setMinValue(1)
            .setMaxValue(50)
        )
    ),

  async execute(interaction, client, guildConfig) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    // Verificar permissão máxima
    const permCheck = checkPermission(
      interaction.member,
      guildId,
      'permissions',
      'command'
    );

    if (!permCheck.allowed) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Sem Permissão')
        .setDescription('Você não tem permissão para gerenciar permissões.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setAuthor({ 
        name: '🔐 Sistema de Permissões Avançado', 
        iconURL: interaction.client.user.avatarURL() 
      });

    try {
      switch (subcommand) {
        case 'painel':
          await handlePainel(interaction, embed);
          break;
        case 'usuario':
          await handleUsuario(interaction, embed);
          break;
        case 'cargo':
          await handleCargo(interaction, embed);
          break;
        case 'canal':
          await handleCanal(interaction, embed);
          break;
        case 'estatisticas':
          await handleEstatisticas(interaction, embed);
          break;
        case 'exportar':
          await handleExportar(interaction, embed);
          break;
        case 'importar':
          await handleImportar(interaction, embed);
          break;
        case 'audit':
          await handleAudit(interaction, embed);
          break;
        default:
          embed.setColor('#ff0000').setTitle('❌ Subcomando inválido');
          return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (error) {
      console.error('Erro em permissions:', error);
      embed.setColor('#ff0000').setTitle('❌ Erro').setDescription(`Ocorreu um erro: ${error.message}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};

// ============================================
// FUNÇÕES DE MANIPULAÇÃO
// ============================================

async function handlePainel(interaction, embed) {
  const stats = getStatistics(interaction.guildId);
  
  const menu = new StringSelectMenuBuilder()
    .setCustomId('permissions_painel_menu')
    .setPlaceholder('🔧 Selecione uma opção')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('👥 Gerenciar Usuários')
        .setDescription('Definir permissões para usuários específicos')
        .setValue('users'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🛡️ Gerenciar Cargos')
        .setDescription('Definir permissões para cargos')
        .setValue('roles'),
      new StringSelectMenuOptionBuilder()
        .setLabel('📺 Gerenciar Canais')
        .setDescription('Definir permissões para canais')
        .setValue('channels'),
      new StringSelectMenuOptionBuilder()
        .setLabel('📊 Ver Estatísticas')
        .setDescription('Estatísticas do sistema')
        .setValue('stats'),
      new StringSelectMenuOptionBuilder()
        .setLabel('📋 Ver Auditoria')
        .setDescription('Log de alterações')
        .setValue('audit')
    );

  const row = new ActionRowBuilder().addComponents(menu);

  embed
    .setTitle('🔐 Painel de Permissões')
    .setDescription('Sistema avançado de gerenciamento de permissões')
    .addFields(
      { name: '👥 Usuários', value: stats.users.toString(), inline: true },
      { name: '🛡️ Cargos', value: stats.roles.toString(), inline: true },
      { name: '📺 Canais', value: stats.channels.toString(), inline: true },
      { name: '📂 Categorias', value: stats.categories.toString(), inline: true },
      { name: '⏰ Temporárias', value: stats.temporaryPermissions.toString(), inline: true },
      { name: '📋 Auditoria', value: stats.auditLogEntries.toString(), inline: true }
    )
    .setFooter({ text: 'Selecione uma opção para continuar' });

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleUsuario(interaction, embed) {
  const user = interaction.options.getUser('usuario');
  const action = interaction.options.getString('acao');
  const command = interaction.options.getString('comando') || '*';
  const reason = interaction.options.getString('motivo') || 'Sem motivo especificado';
  const duration = interaction.options.getString('duracao');

  switch (action) {
    case 'view':
      const guildConfig = getGuildConfig(interaction.guildId);
      const userPerms = guildConfig.permissions.users[user.id] || {};
      
      embed
        .setTitle(`👥 Permissões de ${user.username}`)
        .setThumbnail(user.displayAvatarURL())
        .setDescription('Permissões configuradas para este usuário:');

      if (Object.keys(userPerms).length === 0) {
        embed.addFields({
          name: '📋 Status',
          value: 'Nenhuma permissão específica configurada',
          inline: false
        });
      } else {
        Object.entries(userPerms).forEach(([type, perms]) => {
          const permsList = Object.entries(perms).map(([resource, config]) => 
            `• **${resource}**: ${config.allowed ? '✅ Permitido' : '❌ Bloqueado'}`
          ).join('\n');
          
          embed.addFields({
            name: `📂 ${type.toUpperCase()}`,
            value: permsList || 'Nenhuma',
            inline: false
          });
        });
      }
      break;

    case 'grant':
      const grantResult = setUserPermission(
        interaction.guildId,
        user.id,
        command,
        'command',
        true,
        reason,
        { grantedBy: interaction.user.id }
      );

      if (grantResult) {
        embed
          .setColor('#00ff00')
          .setTitle('✅ Permissão Concedida')
          .setDescription(`Permissão concedida para ${user}`)
          .addFields(
            { name: '👤 Usuário', value: user.toString(), inline: true },
            { name: '⚙️ Comando', value: command === '*' ? 'Todos' : `/${command}`, inline: true },
            { name: '📝 Motivo', value: reason, inline: true }
          );
      } else {
        embed.setColor('#ff0000').setTitle('❌ Erro').setDescription('Falha ao conceder permissão');
      }
      break;

    case 'revoke':
      const revokeResult = removePermission(
        interaction.guildId,
        user.id,
        command,
        'command',
        'user'
      );

      if (revokeResult) {
        embed
          .setColor('#ffaa00')
          .setTitle('✅ Permissão Revogada')
          .setDescription(`Permissão revogada para ${user}`)
          .addFields(
            { name: '👤 Usuário', value: user.toString(), inline: true },
            { name: '⚙️ Comando', value: command === '*' ? 'Todos' : `/${command}`, inline: true }
          );
      } else {
        embed.setColor('#ff0000').setTitle('❌ Erro').setDescription('Falha ao revogar permissão');
      }
      break;

    case 'temp':
      if (!duration) {
        embed.setColor('#ff0000').setTitle('❌ Duração Obrigatória').setDescription('Especifique a duração (ex: 1h, 30m, 7d)');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const durationMs = parseDuration(duration);
      if (!durationMs) {
        embed.setColor('#ff0000').setTitle('❌ Duração Inválida').setDescription('Use formato como: 1h, 30m, 7d');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const tempResult = setTemporaryPermission(
        interaction.guildId,
        user.id,
        command,
        'command',
        true,
        durationMs,
        reason,
        { grantedBy: interaction.user.id }
      );

      if (tempResult) {
        embed
          .setColor('#00ff00')
          .setTitle('⏰ Permissão Temporária Concedida')
          .setDescription(`Permissão temporária concedida para ${user}`)
          .addFields(
            { name: '👤 Usuário', value: user.toString(), inline: true },
            { name: '⚙️ Comando', value: command === '*' ? 'Todos' : `/${command}`, inline: true },
            { name: '⏰ Duração', value: duration, inline: true },
            { name: '📝 Motivo', value: reason, inline: true }
          );
      } else {
        embed.setColor('#ff0000').setTitle('❌ Erro').setDescription('Falha ao conceder permissão temporária');
      }
      break;
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleCargo(interaction, embed) {
  const role = interaction.options.getRole('cargo');
  const action = interaction.options.getString('acao');
  const command = interaction.options.getString('comando') || '*';
  const reason = interaction.options.getString('motivo') || 'Sem motivo especificado';
  const template = interaction.options.getString('template');

  switch (action) {
    case 'view':
      const guildConfig = getGuildConfig(interaction.guildId);
      const rolePerms = guildConfig.permissions.roles[role.id] || {};
      
      embed
        .setTitle(`🛡️ Permissões do Cargo ${role.name}`)
        .setColor(role.color || '#0099ff')
        .setDescription('Permissões configuradas para este cargo:');

      if (Object.keys(rolePerms).length === 0) {
        embed.addFields({
          name: '📋 Status',
          value: 'Nenhuma permissão específica configurada',
          inline: false
        });
      } else {
        // Mostrar nível se configurado
        if (rolePerms.level) {
          const levelInfo = PERMISSION_LEVELS[rolePerms.level];
          embed.addFields({
            name: '🏆 Nível de Permissão',
            value: `${levelInfo.emoji || '🏆'} ${levelInfo.name}`,
            inline: true
          });
        }

        // Mostrar permissões específicas
        Object.entries(rolePerms).forEach(([type, perms]) => {
          if (type === 'level') return;
          
          const permsList = Object.entries(perms).map(([resource, config]) => 
            `• **${resource}**: ${config.allowed ? '✅ Permitido' : '❌ Bloqueado'}`
          ).join('\n');
          
          embed.addFields({
            name: `📂 ${type.toUpperCase()}`,
            value: permsList || 'Nenhuma',
            inline: false
          });
        });
      }
      break;

    case 'grant':
      const grantResult = setRolePermission(
        interaction.guildId,
        role.id,
        command,
        'command',
        true,
        reason,
        { grantedBy: interaction.user.id }
      );

      if (grantResult) {
        embed
          .setColor('#00ff00')
          .setTitle('✅ Permissão Concedida')
          .setDescription(`Permissão concedida para o cargo ${role}`)
          .addFields(
            { name: '🛡️ Cargo', value: role.toString(), inline: true },
            { name: '⚙️ Comando', value: command === '*' ? 'Todos' : `/${command}`, inline: true },
            { name: '📝 Motivo', value: reason, inline: true }
          );
      } else {
        embed.setColor('#ff0000').setTitle('❌ Erro').setDescription('Falha ao conceder permissão');
      }
      break;

    case 'revoke':
      const revokeResult = removePermission(
        interaction.guildId,
        role.id,
        command,
        'command',
        'role'
      );

      if (revokeResult) {
        embed
          .setColor('#ffaa00')
          .setTitle('✅ Permissão Revogada')
          .setDescription(`Permissão revogada para o cargo ${role}`)
          .addFields(
            { name: '🛡️ Cargo', value: role.toString(), inline: true },
            { name: '⚙️ Comando', value: command === '*' ? 'Todos' : `/${command}`, inline: true }
          );
      } else {
        embed.setColor('#ff0000').setTitle('❌ Erro').setDescription('Falha ao revogar permissão');
      }
      break;

    case 'template':
      if (!template) {
        embed.setColor('#ff0000').setTitle('❌ Template Obrigatório').setDescription('Selecione um template para aplicar');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const templateResult = applyTemplate(
        interaction.guildId,
        template,
        role.id,
        'role'
      );

      if (templateResult) {
        embed
          .setColor('#00ff00')
          .setTitle('📋 Template Aplicado')
          .setDescription(`Template "${template}" aplicado ao cargo ${role}`)
          .addFields(
            { name: '🛡️ Cargo', value: role.toString(), inline: true },
            { name: '📋 Template', value: template, inline: true }
          );
      } else {
        embed.setColor('#ff0000').setTitle('❌ Erro').setDescription('Falha ao aplicar template');
      }
      break;
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleCanal(interaction, embed) {
  const channel = interaction.options.getChannel('canal');
  const action = interaction.options.getString('acao');
  const command = interaction.options.getString('comando') || '*';

  switch (action) {
    case 'view':
      const guildConfig = getGuildConfig(interaction.guildId);
      const channelPerms = guildConfig.permissions.channels[channel.id] || {};
      
      embed
        .setTitle(`📺 Permissões do Canal ${channel.name}`)
        .setDescription('Permissões configuradas para este canal:');

      if (Object.keys(channelPerms).length === 0) {
        embed.addFields({
          name: '📋 Status',
          value: 'Nenhuma permissão específica configurada',
          inline: false
        });
      } else {
        Object.entries(channelPerms).forEach(([type, perms]) => {
          const permsList = Object.entries(perms).map(([resource, config]) => 
            `• **${resource}**: ${config.allowed ? '✅ Permitido' : '❌ Bloqueado'}`
          ).join('\n');
          
          embed.addFields({
            name: `📂 ${type.toUpperCase()}`,
            value: permsList || 'Nenhuma',
            inline: false
          });
        });
      }
      break;

    case 'allow':
      const allowResult = setRolePermission(
        interaction.guildId,
        channel.id,
        command,
        'command',
        true,
        'Permissão concedida via comando',
        { grantedBy: interaction.user.id }
      );

      if (allowResult) {
        embed
          .setColor('#00ff00')
          .setTitle('✅ Permissão Permitida')
          .setDescription(`Comando permitido no canal ${channel}`)
          .addFields(
            { name: '📺 Canal', value: channel.toString(), inline: true },
            { name: '⚙️ Comando', value: command === '*' ? 'Todos' : `/${command}`, inline: true }
          );
      } else {
        embed.setColor('#ff0000').setTitle('❌ Erro').setDescription('Falha ao permitir comando');
      }
      break;

    case 'deny':
      const denyResult = setRolePermission(
        interaction.guildId,
        channel.id,
        command,
        'command',
        false,
        'Comando bloqueado via comando',
        { grantedBy: interaction.user.id }
      );

      if (denyResult) {
        embed
          .setColor('#ff0000')
          .setTitle('❌ Comando Bloqueado')
          .setDescription(`Comando bloqueado no canal ${channel}`)
          .addFields(
            { name: '📺 Canal', value: channel.toString(), inline: true },
            { name: '⚙️ Comando', value: command === '*' ? 'Todos' : `/${command}`, inline: true }
          );
      } else {
        embed.setColor('#ff0000').setTitle('❌ Erro').setDescription('Falha ao bloquear comando');
      }
      break;
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleEstatisticas(interaction, embed) {
  const stats = getStatistics(interaction.guildId);
  
  embed
    .setTitle('📊 Estatísticas do Sistema de Permissões')
    .setDescription('Estatísticas detalhadas do sistema:')
    .addFields(
      { name: '👥 Usuários com Permissões', value: stats.users.toString(), inline: true },
      { name: '🛡️ Cargos com Permissões', value: stats.roles.toString(), inline: true },
      { name: '📺 Canais com Permissões', value: stats.channels.toString(), inline: true },
      { name: '📂 Categorias Configuradas', value: stats.categories.toString(), inline: true },
      { name: '⏰ Permissões Temporárias', value: stats.temporaryPermissions.toString(), inline: true },
      { name: '📋 Entradas na Auditoria', value: stats.auditLogEntries.toString(), inline: true }
    )
    .addFields({
      name: '📅 Última Atualização',
      value: new Date(stats.lastUpdated).toLocaleString('pt-BR'),
      inline: false
    });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleExportar(interaction, embed) {
  const config = exportConfig(interaction.guildId);
  
  embed
    .setColor('#00ff00')
    .setTitle('📤 Configuração Exportada')
    .setDescription('Configuração de permissões exportada com sucesso!')
    .addFields({
      name: '📄 JSON',
      value: `\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\``,
      inline: false
    });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleImportar(interaction, embed) {
  const configString = interaction.options.getString('config');
  
  try {
    const configData = JSON.parse(configString);
    const result = importConfig(configData, interaction.guildId);
    
    if (result) {
      embed
        .setColor('#00ff00')
        .setTitle('📥 Configuração Importada')
        .setDescription('Configuração importada com sucesso!');
    } else {
      embed.setColor('#ff0000').setTitle('❌ Erro').setDescription('Falha ao importar configuração');
    }
  } catch (error) {
    embed.setColor('#ff0000').setTitle('❌ JSON Inválido').setDescription('O JSON fornecido é inválido.');
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAudit(interaction, embed) {
  const limit = interaction.options.getInteger('limite') || 10;
  const guildConfig = getGuildConfig(interaction.guildId);
  const auditLog = permissionManager.config.auditLog || [];
  
  const recentLogs = auditLog.slice(0, limit);
  
  if (recentLogs.length === 0) {
    embed
      .setTitle('📋 Log de Auditoria')
      .setDescription('Nenhuma entrada encontrada no log de auditoria.');
  } else {
    embed
      .setTitle('📋 Log de Auditoria')
      .setDescription(`Últimas ${recentLogs.length} entradas:`);

    recentLogs.forEach((entry, index) => {
      const timestamp = new Date(entry.timestamp).toLocaleString('pt-BR');
      embed.addFields({
        name: `${index + 1}. ${entry.action.replace('_', ' ').toUpperCase()}`,
        value: `📅 **Data:** ${timestamp}\n👤 **Por:** ${entry.grantedBy || 'Sistema'}\n📝 **Detalhes:** ${entry.reason || 'N/A'}`,
        inline: false
      });
    });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function parseDuration(durationStr) {
  const match = durationStr.match(/^(\d+)([smhd])$/);
  if (!match) return null;

  const [, amount, unit] = match;
  const multipliers = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000
  };

  return parseInt(amount) * multipliers[unit];
}

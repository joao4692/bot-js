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
  TextInputStyle
} = require('discord.js');
const advancedWhitelist = require('../../data/whitelist/advancedWhitelistManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist-advanced')
    .setDescription('[ADMIN] Sistema avançado de whitelist com logs e aprovações')
    .addSubcommand(subcommand =>
      subcommand
        .setName('configurar')
        .setDescription('Configurar sistema de whitelist do servidor')
        .addBooleanOption(option =>
          option
            .setName('ativar')
            .setDescription('Ativar sistema de whitelist')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName('cargo_verificação')
            .setDescription('Cargo necessário para verificação')
        )
        .addChannelOption(option =>
          option
            .setName('canal_verificação')
            .setDescription('Canal para verificação')
        )
        .addStringOption(option =>
          option
            .setName('mensagem')
            .setDescription('Mensagem de verificação (use {user} para o nome)')
            .setRequired(false)
        )
        .addRoleOption(option =>
          option
            .setName('cargo_aprovado')
            .setDescription('Cargo dado após aprovação')
        )
        .addBooleanOption(option =>
          option
            .setName('cargo_automatico')
            .setDescription('Dar cargo automaticamente após aprovação')
        )
        .addIntegerOption(option =>
          option
            .setName('idade_minima')
            .setDescription('Idade mínima da conta (dias)')
            .setMinValue(0)
            .setMaxValue(365)
        )
        .addIntegerOption(option =>
          option
            .setName('tempo_servidor')
            .setDescription('Tempo mínimo no servidor (horas)')
            .setMinValue(0)
            .setMaxValue(168)
        )
        .addBooleanOption(option =>
          option
            .setName('exigir_motivo')
            .setDescription('Exigir motivo para adicionar usuários')
        )
        .addBooleanOption(option =>
          option
            .setName('aprovação_automatica')
            .setDescription('Aprovar automaticamente após tempo mínimo')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('adicionar')
        .setDescription('Adicionar usuário à whitelist')
        .addUserOption(option =>
          option
            .setName('usuário')
            .setDescription('Usuário para adicionar')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('motivo')
            .setDescription('Motivo da adição')
        )
        .addStringOption(option =>
          option
            .setName('status')
            .setDescription('Status inicial')
            .addChoices(
              { name: '🔄 Pendente', value: 'pending' },
              { name: '✅ Aprovado', value: 'approved' },
              { name: '❌ Rejeitado', value: 'rejected' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remover')
        .setDescription('Remover usuário da whitelist')
        .addUserOption(option =>
          option
            .setName('usuário')
            .setDescription('Usuário para remover')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('motivo')
            .setDescription('Motivo da remoção')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('aprovar')
        .setDescription('Aprovar usuário pendente')
        .addUserOption(option =>
          option
            .setName('usuário')
            .setDescription('Usuário para aprovar')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('motivo')
            .setDescription('Motivo da aprovação')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rejeitar')
        .setDescription('Rejeitar usuário pendente')
        .addUserOption(option =>
          option
            .setName('usuário')
            .setDescription('Usuário para rejeitar')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('motivo')
            .setDescription('Motivo da rejeição')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('buscar')
        .setDescription('Buscar usuários na whitelist')
        .addStringOption(option =>
          option
            .setName('status')
            .setDescription('Filtrar por status')
            .addChoices(
              { name: '🔄 Pendentes', value: 'pending' },
              { name: '✅ Aprovados', value: 'approved' },
              { name: '❌ Rejeitados', value: 'rejected' },
              { name: '📋 Todos', value: 'all' }
            )
        )
        .addUserOption(option =>
          option
            .setName('adicionado_por')
            .setDescription('Filtrar por quem adicionou')
        )
        .addStringOption(option =>
          option
            .setName('busca')
            .setDescription('Buscar por nome ou ID')
        )
        .addIntegerOption(option =>
          option
            .setName('limite')
          .setDescription('Limite de resultados')
            .setMinValue(1)
            .setMaxValue(50)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('listar')
        .setDescription('Listar usuários da whitelist')
        .addStringOption(option =>
          option
            .setName('status')
            .setDescription('Filtrar por status')
            .addChoices(
              { name: '🔄 Pendentes', value: 'pending' },
              { name: '✅ Aprovados', value: 'approved' },
              { name: '❌ Rejeitados', value: 'rejected' },
              { name: '📋 Todos', value: 'all' }
            )
        )
        .addIntegerOption(option =>
          option
            .setName('página')
          .setDescription('Número da página')
            .setMinValue(1)
            .setMaxValue(10)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('estatísticas')
        .setDescription('Ver estatísticas da whitelist')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('logs')
        .setDescription('Ver logs de operações da whitelist')
        .addStringOption(option =>
          option
            .setName('ação')
            .setDescription('Filtrar por ação')
            .addChoices(
              { name: '➕ Adições', value: 'add_user' },
              { name: '➖ Remoções', value: 'remove_user' },
              { name: '✅ Aprovações', value: 'approve_user' },
              { name: '❌ Rejeições', value: 'reject_user' },
              { name: '🧹 Limpezas', value: 'cleanup' },
              { name: '📋 Todas', value: 'all' }
            )
        )
        .addUserOption(option =>
          option
            .setName('moderador')
            .setDescription('Filtrar por moderador')
        )
        .addIntegerOption(option =>
          option
            .setName('limite')
            .setDescription('Limite de logs')
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('limpar')
        .setDescription('Limpar usuários expirados ou redefinir sistema')
        .addStringOption(option =>
          option
            .setName('tipo')
            .setDescription('Tipo de limpeza')
            .addChoices(
              { name: '⏰ Expirados', value: 'expired' },
              { name: '🗑️ Pendentes', value: 'pending' },
              { name: '🧹 Todos', value: 'all' }
            )
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dashboard')
        .setDescription('Abrir dashboard interativo da whitelist')
    ),

  async execute(interaction, client) {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content: '❌ Apenas administradores podem usar este comando.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'configurar':
          await handleConfig(interaction);
          break;
        case 'adicionar':
          await handleAdd(interaction);
          break;
        case 'remover':
          await handleRemove(interaction);
          break;
        case 'aprovar':
          await handleApprove(interaction);
          break;
        case 'rejeitar':
          await handleReject(interaction);
          break;
        case 'buscar':
          await handleSearch(interaction);
          break;
        case 'listar':
          await handleList(interaction);
          break;
        case 'estatísticas':
          await handleStats(interaction);
          break;
        case 'logs':
          await handleLogs(interaction);
          break;
        case 'limpar':
          await handleCleanup(interaction);
          break;
        case 'dashboard':
          await handleDashboard(interaction, client);
          break;
      }
    } catch (error) {
      console.error('Erro em whitelist-advanced:', error);
      await interaction.followUp({
        content: '❌ Ocorreu um erro ao processar o comando.',
        ephemeral: true
      });
    }
  }
};

async function handleConfig(interaction) {
  const enabled = interaction.options.getBoolean('ativar');
  const verifyRole = interaction.options.getRole('cargo_verificação');
  const verifyChannel = interaction.options.getChannel('canal_verificação');
  const message = interaction.options.getString('mensagem') || "Olá {user}! Bem-vindo ao servidor. Você precisa ser verificado para acessar o servidor.";
  const approvedRole = interaction.options.getRole('cargo_aprovado');
  const autoRole = interaction.options.getBoolean('cargo_automatico');
  const minAge = interaction.options.getInteger('idade_minima') || 7;
  const minServerTime = interaction.options.getInteger('tempo_servidor') || 1;
  const requireReason = interaction.options.getBoolean('exigir_motivo');
  const autoApprove = interaction.options.getBoolean('aprovação_automatica');

  const config = {
    enabled,
    requiredRole: verifyRole?.id || null,
    whitelistChannel: verifyChannel?.id || null,
    verifyMessage: message,
    approvedRole: approvedRole?.id || null,
    autoRole,
    minAccountAge: minAge,
    minServerTime: minServerTime,
    requireReason,
    autoApprove
  };

  const saved = advancedWhitelist.saveServerConfig(interaction.guildId, config);

  const embed = new EmbedBuilder()
    .setColor(saved ? '#00ff00' : '#ff0000')
    .setTitle(saved ? '✅ Configuração Salva' : '❌ Erro ao Salvar')
    .setDescription(saved ? 'Sistema de whitelist configurado com sucesso!' : 'Ocorreu um erro ao salvar a configuração.')
    .addFields(
      { name: '🔧 Status', value: enabled ? 'Ativado' : 'Desativado', inline: true },
      { name: '👮 Verificação', value: verifyRole?.name || 'Padrão', inline: true },
      { name: '📢 Canal', value: verifyChannel?.name || 'Padrão', inline: true },
      { name: '🤖 Auto Cargo', value: autoRole ? 'Sim' : 'Não', inline: true },
      { name: '📅 Idade Mínima', value: `${minAge} dias`, inline: true },
      { name: '⏰ Tempo Servidor', value: `${minServerTime} horas`, inline: true }
    )
    .setTimestamp();

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleAdd(interaction) {
  const user = interaction.options.getUser('usuário');
  const reason = interaction.options.getString('motivo');
  const status = interaction.options.getString('status') || 'pending';

  const result = await advancedWhitelist.add(
    interaction.guildId,
    user.id,
    user.tag,
    interaction.user.id,
    reason,
    status
  );

  const embed = new EmbedBuilder()
    .setColor(result.success ? '#00ff00' : '#ff0000')
    .setTitle(result.success ? '✅ Usuário Adicionado' : '❌ Erro ao Adicionar')
    .setDescription(result.message)
    .addFields(
      { name: '👤 Usuário', value: user.tag, inline: true },
      { name: '📝 Status', value: status.toUpperCase(), inline: true },
      { name: '💬 Motivo', value: reason || 'Nenhum', inline: true }
    )
    .setTimestamp();

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleRemove(interaction) {
  const user = interaction.options.getUser('usuário');
  const reason = interaction.options.getString('motivo');

  const result = await advancedWhitelist.remove(
    interaction.guildId,
    user.id,
    interaction.user.id,
    reason
  );

  const embed = new EmbedBuilder()
    .setColor(result.success ? '#00ff00' : '#ff0000')
    .setTitle(result.success ? '✅ Usuário Removido' : '❌ Erro ao Remover')
    .setDescription(result.message)
    .addFields(
      { name: '👤 Usuário', value: user.tag, inline: true },
      { name: '💬 Motivo', value: reason || 'Nenhum', inline: true }
    )
    .setTimestamp();

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleApprove(interaction) {
  const user = interaction.options.getUser('usuário');
  const reason = interaction.options.getString('motivo');

  const result = await advancedWhitelist.approve(
    interaction.guildId,
    user.id,
    interaction.user.id,
    reason
  );

  const embed = new EmbedBuilder()
    .setColor(result.success ? '#00ff00' : '#ff0000')
    .setTitle(result.success ? '✅ Usuário Aprovado' : '❌ Erro ao Aprovar')
    .setDescription(result.message)
    .addFields(
      { name: '👤 Usuário', value: user.tag, inline: true },
      { name: '💬 Motivo', value: reason || 'Aprovação padrão', inline: true }
    )
    .setTimestamp();

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleReject(interaction) {
  const user = interaction.options.getUser('usuário');
  const reason = interaction.options.getString('motivo');

  const result = await advancedWhitelist.reject(
    interaction.guildId,
    user.id,
    interaction.user.id,
    reason
  );

  const embed = new EmbedBuilder()
    .setColor(result.success ? '#00ff00' : '#ff0000')
    .setTitle(result.success ? '✅ Usuário Rejeitado' : '❌ Erro ao Rejeitar')
    .setDescription(result.message)
    .addFields(
      { name: '👤 Usuário', value: user.tag, inline: true },
      { name: '💬 Motivo', value: reason || 'Rejeição padrão', inline: true }
    )
    .setTimestamp();

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleSearch(interaction) {
  const status = interaction.options.getString('status');
  const addedBy = interaction.options.getUser('adicionado_por');
  const search = interaction.options.getString('busca');
  const limit = interaction.options.getInteger('limite') || 20;

  const filters = {};
  if (status !== 'all') filters.status = status;
  if (addedBy) filters.addedBy = addedBy.id;
  if (search) filters.search = search;
  filters.limit = limit;

  const users = await advancedWhitelist.search(interaction.guildId, filters);

  if (users.length === 0) {
    return interaction.followUp({
      embeds: [new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('🔍 Nenhum Resultado')
        .setDescription('Nenhum usuário encontrado com os filtros especificados.')
      ],
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('🔍 Resultados da Busca')
    .setDescription(`Encontrados **${users.length}** usuários`)
    .addFields(
      { name: '📊 Filtros', value: Object.entries(filters).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Nenhum', inline: true },
      { name: '📋 Resultados', value: users.length > 10 ? `${users.slice(0, 10).length} primeiros (mostrando até 10)` : users.length.toString(), inline: true }
    )
    .setTimestamp();

  users.slice(0, 5).forEach((user, index) => {
    embed.addFields({
      name: `${index + 1}. ${user.tag}`,
      value: `📊 Status: ${user.status}\n🕐 Adicionado: ${new Date(user.addedAt).toLocaleString('pt-BR')}\n👤 Por: ${user.addedBy}`,
      inline: false
    });
  });

  if (users.length > 5) {
    embed.addFields({
      name: '📄 Mais Resultados',
      value: `E mais ${users.length - 5} usuários. Use filtros mais específicos.`,
      inline: false
    });
  }

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleList(interaction) {
  const status = interaction.options.getString('status');
  const page = interaction.options.getInteger('página') || 1;

  const filters = {};
  if (status !== 'all') filters.status = status;

  const users = await advancedWhitelist.search(interaction.guildId, filters);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, users.length);
  const pageUsers = users.slice(startIndex, endIndex);

  if (pageUsers.length === 0) {
    return interaction.followUp({
      embeds: [new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('📋 Nenhum Usuário')
        .setDescription(`Nenhum usuário com status "${status}" encontrado.`)
      ],
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle(`📋 Whitelist - ${status.toUpperCase()} (Página ${page}/${totalPages})`)
    .setDescription(`Mostrando ${pageUsers.length} usuários`)
    .setTimestamp();

  pageUsers.forEach((user, index) => {
    const statusEmoji = {
      pending: '🔄',
      approved: '✅',
      rejected: '❌',
      expired: '⏰'
    }[user.status] || '❓';

    embed.addFields({
      name: `${startIndex + index + 1}. ${statusEmoji} ${user.tag}`,
      value: `📊 Status: ${user.status}\n🕐 Adicionado: ${new Date(user.addedAt).toLocaleString('pt-BR')}\n👤 Por: ${user.addedBy}`,
      inline: false
    });
  });

  // Navegação
  if (totalPages > 1) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`wl_page_${Math.max(1, page - 1)}`)
        .setLabel('⬅️ Anterior')
        .setStyle(page > 1 ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(page <= 1),
      new ButtonBuilder()
        .setCustomId(`wl_page_${Math.min(totalPages, page + 1)}`)
        .setLabel('Próximo ⬅️')
        .setStyle(page < totalPages ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(page >= totalPages)
    );

    await interaction.followUp({ 
      embeds: [embed], 
      components: [row],
      ephemeral: true 
    });
  } else {
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  }
}

async function handleStats(interaction) {
  const stats = advancedWhitelist.getStatistics(interaction.guildId);

  const embed = new EmbedBuilder()
    .setColor('#3498db')
    .setTitle('📊 Estatísticas da Whitelist')
    .addFields(
      { 
        name: '👥 Total de Usuários', 
        value: stats.total.toString(), 
        inline: true 
      },
      { 
        name: '🔄 Pendentes', 
        value: stats.pending.toString(), 
        inline: true 
      },
      { 
        name: '✅ Aprovados', 
        value: stats.approved.toString(), 
        inline: true 
      },
      { 
        name: '❌ Rejeitados', 
        value: stats.rejected.toString(), 
        inline: true 
      },
      { 
        name: '🕐 Último Adicionado', 
        value: stats.lastAdded ? new Date(stats.lastAdded).toLocaleString('pt-BR') : 'Nenhum', 
        inline: true 
      }
    )
    .setTimestamp();

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleLogs(interaction) {
  const action = interaction.options.getString('ação');
  const moderator = interaction.options.getUser('moderador');
  const limit = interaction.options.getInteger('limite') || 50;

  const logs = advancedWhitelist.getLogs();
  let filteredLogs = logs.logs;

  if (action !== 'all') filteredLogs = filteredLogs.filter(log => log.action === action);
  if (moderator) filteredLogs = filteredLogs.filter(log => log.moderator === moderator.id);
  filteredLogs = filteredLogs.slice(0, limit);

  if (filteredLogs.length === 0) {
    return interaction.followUp({
      embeds: [new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('📋 Nenhum Log')
        .setDescription('Nenhum log encontrado com os filtros especificados.')
      ],
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('📋 Logs da Whitelist')
    .setDescription(`Mostrando **${filteredLogs.length}** logs mais recentes`)
    .addFields(
      { name: '🔍 Filtros', value: `Ação: ${action}${moderator ? ` | Moderador: ${moderator.tag}` : ''}`, inline: true },
      { name: '📊 Total', value: filteredLogs.length.toString(), inline: true }
    )
    .setTimestamp();

  filteredLogs.slice(0, 5).forEach((log, index) => {
    embed.addFields({
      name: `${index + 1}. [${log.action}]`,
      value: `🕐 ${new Date(log.timestamp).toLocaleString('pt-BR')}\n💬 ${log.description}\n👤 ${log.moderator}`,
      inline: false
    });
  });

  if (filteredLogs.length > 5) {
    embed.addFields({
      name: '📄 Mais Logs',
      value: `E mais ${filteredLogs.length - 5} logs. Use filtros mais específicos.`,
      inline: false
    });
  }

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleCleanup(interaction) {
  const type = interaction.options.getString('tipo');

  switch (type) {
    case 'expired':
      const cleanedCount = advancedWhitelist.cleanup();
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🧹 Limpeza Concluída')
        .setDescription(`Removidos **${cleanedCount}** usuários expirados.`)
        .setTimestamp();
      await interaction.followUp({ embeds: [embed], ephemeral: true });
      break;

    case 'pending':
      // Implementar limpeza de pendentes
      await interaction.followUp({
        embeds: [new EmbedBuilder()
          .setColor('#ff9900')
          .setTitle('⚠️ Em Desenvolvimento')
          .setDescription('Função de limpar usuários pendentes em desenvolvimento.')
        ],
        ephemeral: true
      });
      break;

    case 'all':
      // Implementar limpeza completa
      await interaction.followUp({
        embeds: [new EmbedBuilder()
          .setColor('#ff9900')
          .setTitle('⚠️ Em Desenvolvimento')
          .setDescription('Função de limpeza completa em desenvolvimento.')
        ],
        ephemeral: true
      });
      break;
  }
}

async function handleDashboard(interaction, client) {
  const stats = advancedWhitelist.getStatistics(interaction.guildId);
  const config = advancedWhitelist.getServerConfig(interaction.guildId);

  const embed = new EmbedBuilder()
    .setColor('#9b59b6')
    .setTitle('📊 Dashboard da Whitelist')
    .setDescription('Painel de controle em tempo real')
    .addFields(
      { 
        name: '🔧 Status do Sistema', 
        value: config.enabled ? '🟢 Ativado' : '🔴 Desativado', 
        inline: true 
      },
      { 
        name: '👥 Total de Usuários', 
        value: stats.total.toString(), 
        inline: true 
      },
      { 
        name: '🔄 Pendentes', 
        value: stats.pending.toString(), 
        inline: true 
      },
      { 
        name: '✅ Aprovados', 
        value: stats.approved.toString(), 
        inline: true 
      }
    )
    .setTimestamp()
    .setFooter({ text: 'Sistema Avançado v2.0' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('wl_refresh')
      .setLabel('🔄 Atualizar')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('wl_approve_all')
      .setLabel('✅ Aprovar Todos')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('wl_cleanup')
      .setLabel('🧹 Limpar Expirados')
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.followUp({ 
    embeds: [embed], 
    components: [row],
    ephemeral: true 
  });
}

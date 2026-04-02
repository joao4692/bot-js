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
const advancedLogger = require('../../utils/advancedLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('[ADMIN] Sistema avançado de logs e monitoramento')
    .addSubcommand(subcommand =>
      subcommand
        .setName('buscar')
        .setDescription('Buscar logs com filtros avançados')
        .addStringOption(option =>
          option
            .setName('categoria')
            .setDescription('Categoria do log')
            .addChoices(
              { name: '🏠 Sistema', value: 'system' },
              { name: '💰 Economia', value: 'economy' },
              { name: '🏦 Banco', value: 'bank' },
              { name: '🔒 Permissões', value: 'permissions' },
              { name: '⚙️ Comandos', value: 'commands' },
              { name: '❌ Erros', value: 'errors' },
              { name: '🔐 Segurança', value: 'security' },
              { name: '🛡️ Moderação', value: 'moderation' },
              { name: '📊 Auditoria', value: 'audit' }
            )
        )
        .addStringOption(option =>
          option
            .setName('nível')
            .setDescription('Nível do log')
            .addChoices(
              { name: '🐞 DEBUG', value: '0' },
              { name: 'ℹ️ INFO', value: '1' },
              { name: '⚠️ WARN', value: '2' },
              { name: '❌ ERROR', value: '3' },
              { name: '🚨 CRITICAL', value: '4' }
            )
        )
        .addStringOption(option =>
          option
            .setName('mensagem')
            .setDescription('Buscar por mensagem (parcial)')
        )
        .addStringOption(option =>
          option
            .setName('usuário')
            .setDescription('ID do usuário')
        )
        .addNumberOption(option =>
          option
            .setName('limite')
            .setDescription('Limite de resultados')
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('exportar')
        .setDescription('Exportar logs em diferentes formatos')
        .addStringOption(option =>
          option
            .setName('formato')
            .setDescription('Formato de exportação')
            .addChoices(
              { name: '📄 JSON', value: 'json' },
              { name: '📊 CSV', value: 'csv' },
              { name: '📝 TXT', value: 'txt' }
            )
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('categoria')
            .setDescription('Categoria (opcional)')
            .addChoices(
              { name: '🏠 Sistema', value: 'system' },
              { name: '💰 Economia', value: 'economy' },
              { name: '🏦 Banco', value: 'bank' },
              { name: '🔒 Permissões', value: 'permissions' },
              { name: '⚙️ Comandos', value: 'commands' },
              { name: '❌ Erros', value: 'errors' },
              { name: '🔐 Segurança', value: 'security' },
              { name: '🛡️ Moderação', value: 'moderation' },
              { name: '📊 Auditoria', value: 'audit' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('estatísticas')
        .setDescription('Ver estatísticas do sistema de logs')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('limpar')
        .setDescription('Limpar cache e logs antigos')
        .addStringOption(option =>
          option
            .setName('tipo')
            .setDescription('O que limpar')
            .addChoices(
              { name: '💾 Cache', value: 'cache' },
              { name: '🗑️ Logs Antigos', value: 'old' },
              { name: '🧹 Tudo', value: 'all' }
            )
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dashboard')
        .setDescription('Abrir dashboard visual de logs')
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
        case 'buscar':
          await handleSearch(interaction);
          break;
        case 'exportar':
          await handleExport(interaction);
          break;
        case 'estatísticas':
          await handleStats(interaction);
          break;
        case 'limpar':
          await handleCleanup(interaction);
          break;
        case 'dashboard':
          await handleDashboard(interaction, client);
          break;
      }
    } catch (error) {
      console.error('Erro em logs:', error);
      await interaction.followUp({
        content: '❌ Ocorreu um erro ao processar o comando.',
        ephemeral: true
      });
    }
  }
};

async function handleSearch(interaction) {
  const category = interaction.options.getString('categoria');
  const level = interaction.options.getString('nível');
  const message = interaction.options.getString('mensagem');
  const user = interaction.options.getString('usuário');
  const limit = interaction.options.getNumber('limite') || 50;

  const filters = {};
  if (category) filters.category = category;
  if (level) filters.level = parseInt(level);
  if (message) filters.message = message;
  if (user) filters.user = user;
  filters.limit = limit;

  const results = await advancedLogger.search(filters);

  if (results.length === 0) {
    return interaction.followUp({
      embeds: [new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('🔍 Nenhum Resultado')
        .setDescription('Nenhum log encontrado com os filtros especificados.')
      ],
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('🔍 Resultados da Busca')
    .setDescription(`Encontrados **${results.length}** logs`)
    .addFields(
      { name: '📊 Filtros', value: Object.entries(filters).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Nenhum', inline: true },
      { name: '📋 Resultados', value: results.length > 10 ? `${results.slice(0, 10).length} primeiros (mostrando até 10)` : results.length.toString(), inline: true }
    )
    .setTimestamp();

  // Adicionar os primeiros resultados
  results.slice(0, 5).forEach((log, index) => {
    embed.addFields({
      name: `${index + 1}. [${log.category}] ${log.message.substring(0, 100)}`,
      value: `🕐 ${new Date(log.timestamp).toLocaleString('pt-BR')}\n👤 ${log.user}\n🏠 ${log.guild}`,
      inline: false
    });
  });

  if (results.length > 5) {
    embed.addFields({
      name: '📄 Mais Resultados',
      value: `E mais ${results.length - 5} logs. Use filtros mais específicos.`,
      inline: false
    });
  }

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleExport(interaction) {
  const format = interaction.options.getString('formato');
  const category = interaction.options.getString('categoria');

  const filters = {};
  if (category) filters.category = category;
  filters.limit = 1000; // Limite alto para exportação

  const data = await advancedLogger.export(filters, format);
  
  // Criar arquivo temporário
  const filename = `logs_export_${Date.now()}.${format}`;
  const filepath = `./temp/${filename}`;
  
  require('fs').mkdirSync('./temp', { recursive: true });
  require('fs').writeFileSync(filepath, data, 'utf8');

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('📤 Logs Exportados')
    .setDescription(`Formato: **${format.toUpperCase()}**\nRegistros: **${data.length} bytes**`)
    .addFields(
      { name: '📁 Arquivo', value: filename, inline: true },
      { name: '📊 Categoria', value: category || 'Todas', inline: true }
    )
    .setTimestamp();

  await interaction.followUp({ 
    embeds: [embed], 
    ephemeral: true,
    files: [{
      attachment: Buffer.from(data),
      name: filename
    }]
  });
}

async function handleStats(interaction) {
  const stats = advancedLogger.getStats();
  const embed = new EmbedBuilder()
    .setColor('#3498db')
    .setTitle('📊 Estatísticas do Sistema de Logs')
    .addFields(
      { 
        name: '📈 Total de Logs', 
        value: stats.total.toString(), 
        inline: true 
      },
      { 
        name: '💾 Cache Atual', 
        value: `${stats.cacheSize}/${LOG_CONFIG.cacheSize}`, 
        inline: true 
      },
      { 
        name: '⏰ Última Rotação', 
        value: new Date(stats.lastRotation).toLocaleString('pt-BR'), 
        inline: true 
      },
      { 
        name: '⏱️ Uptime', 
        value: `${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m`, 
        inline: true 
      }
    )
    .setTimestamp();

  // Adicionar estatísticas por categoria
  const categoryFields = Object.entries(stats.byCategory)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([category, count]) => ({
      name: `📂 ${category}`,
      value: count.toString(),
      inline: true
    }));

  if (categoryFields.length > 0) {
    embed.addFields(categoryFields);
  }

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleCleanup(interaction) {
  const type = interaction.options.getString('tipo');

  switch (type) {
    case 'cache':
      advancedLogger.clearCache();
      await interaction.followUp({
        embeds: [new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('🧹 Cache Limpo')
          .setDescription('Cache de logs limpo com sucesso!')
        ],
        ephemeral: true
      });
      break;

    case 'old':
      // Implementar limpeza de logs antigos
      await interaction.followUp({
        embeds: [new EmbedBuilder()
          .setColor('#ff9900')
          .setTitle('⚠️ Em Desenvolvimento')
          .setDescription('Função de limpar logs antigos em desenvolvimento.')
        ],
        ephemeral: true
      });
      break;

    case 'all':
      advancedLogger.clearCache();
      await interaction.followUp({
        embeds: [new EmbedBuilder()
          .setColor('#ff9900')
          .setTitle('⚠️ Em Desenvolvimento')
          .setDescription('Limpeza completa em desenvolvimento.')
        ],
        ephemeral: true
      });
      break;
  }
}

async function handleDashboard(interaction, client) {
  const stats = advancedLogger.getStats();
  
  const embed = new EmbedBuilder()
    .setColor('#9b59b6')
    .setTitle('📊 Dashboard de Logs - Tempo Real')
    .setDescription('Sistema avançado de monitoramento')
    .addFields(
      { 
        name: '📈 Status Geral', 
        value: '🟢 Operacional', 
        inline: true 
      },
      { 
        name: '💾 Cache', 
        value: `${stats.cacheSize}/${LOG_CONFIG.cacheSize}`, 
        inline: true 
      },
      { 
        name: '📁 Logs Hoje', 
        value: '📊 Ver detalhes', 
        inline: true 
      }
    )
    .setTimestamp()
    .setFooter({ text: 'Sistema de Logs Avançado v2.0' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('logs_refresh')
      .setLabel('🔄 Atualizar')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('logs_export')
      .setLabel('📤 Exportar')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('logs_clear')
      .setLabel('🧹 Limpar Cache')
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.followUp({ 
    embeds: [embed], 
    components: [row],
    ephemeral: true 
  });
}

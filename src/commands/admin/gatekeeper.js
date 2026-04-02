const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const gatekeeper = require('../../data/whitelist/gatekeeperManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gatekeeper')
    .setDescription('[ADMIN] Sistema avançado de controle de acesso (Gatekeeper)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('painel')
        .setDescription('Abrir painel de controle do gatekeeper')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('bypass')
        .setDescription('Conceder bypass temporário para um usuário')
        .addUserOption(option =>
          option
            .setName('usuário')
            .setDescription('Usuário para conceder bypass')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('duração')
            .setDescription('Duração em minutos')
            .setMinValue(1)
            .setMaxValue(60)
        )
        .addStringOption(option =>
          option
            .setName('motivo')
            .setDescription('Motivo do bypass')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('estatísticas')
        .setDescription('Ver estatísticas do gatekeeper')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('limpar')
        .setDescription('Limpar sessões e cache do gatekeeper')
        .addStringOption(option =>
          option
            .setName('tipo')
            .setDescription('O que limpar')
            .addChoices(
              { name: '🔐 Sessões', value: 'sessions' },
              { name: '👥 Usuários Verificados', value: 'verified' },
              { name: '🔓 Bypasses', value: 'bypass' },
              { name: '🧹 Tudo', value: 'all' }
            )
            .setRequired(true)
        )
    ),

  async execute(interaction) {
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
        case 'painel':
          await gatekeeper.createControlPanel(interaction);
          break;
        case 'bypass':
          await handleBypass(interaction);
          break;
        case 'estatísticas':
          await handleStats(interaction);
          break;
        case 'limpar':
          await handleCleanup(interaction);
          break;
      }
    } catch (error) {
      console.error('Erro em gatekeeper:', error);
      await interaction.followUp({
        content: '❌ Ocorreu um erro ao processar o comando.',
        ephemeral: true
      });
    }
  }
};

async function handleBypass(interaction) {
  const user = interaction.options.getUser('usuário');
  const duration = interaction.options.getInteger('duração') || 15;
  const reason = interaction.options.getString('motivo') || 'Bypass temporário';

  if (!user) {
    return interaction.followUp({
      embeds: [new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Usuário Inválido')
        .setDescription('Usuário não encontrado.')
      ],
      ephemeral: true
    });
  }

  await gatekeeper.grantTemporaryBypass(user.id, interaction.guildId, duration, reason);

  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('🔓 Bypass Concedido')
    .setDescription(`Bypass temporário concedido para ${user.tag}`)
    .addFields(
      { name: '⏰ Duração', value: `${duration} minutos`, inline: true },
      { name: '💬 Motivo', value: reason, inline: true },
      { name: '🆔 ID', value: user.id, inline: true }
    )
    .setTimestamp();

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleStats(interaction) {
  const stats = gatekeeper.getStatistics();

  const embed = new EmbedBuilder()
    .setColor('#3498db')
    .setTitle('📊 Estatísticas do Gatekeeper')
    .setDescription('Estatísticas em tempo real do sistema de controle de acesso')
    .addFields(
      { 
        name: '🔐 Sessões Ativas', 
        value: stats.activeSessions.toString(), 
        inline: true 
      },
      { 
        name: '👥 Usuários Verificados', 
        value: stats.verifiedUsers.toString(), 
        inline: true 
      },
      { 
        name: '🔓 Bypasses Ativos', 
        value: stats.activeBypasses.toString(), 
        inline: true 
      },
      { 
        name: '⏱️ Uptime', 
        value: `${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m`, 
        inline: true 
      }
    )
    .addFields(
      { 
        name: '📈 Configurações Atuais', 
        value: `Timeout: ${gatekeeper.CONFIG.verificationTimeout}s\nMáx tentativas: ${gatekeeper.CONFIG.maxAttempts}\nCache: ${gatekeeper.CONFIG.verifiedCacheTime}h`, 
        inline: false 
      }
    )
    .setTimestamp()
    .setFooter({ text: 'Sistema Avançado v2.0' });

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleCleanup(interaction) {
  const type = interaction.options.getString('tipo');

  switch (type) {
    case 'sessions':
      // Limpar sessões ativas
      gatekeeper.verificationSessions.clear();
      await interaction.followUp({
        embeds: [new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('🧹 Sessões Limpeza')
          .setDescription('Todas as sessões de verificação foram limpas.')
        ],
        ephemeral: true
      });
      break;

    case 'verified':
      // Limpar cache de usuários verificados
      gatekeeper.verifiedUsers.clear();
      await interaction.followUp({
        embeds: [new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('🧹 Cache Limpo')
          .setDescription('Cache de usuários verificados foi limpo.')
        ],
        ephemeral: true
      });
      break;

    case 'bypass':
      // Limpar bypasses
      gatekeeper.bypassUsers.clear();
      await interaction.followUp({
        embeds: [new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('🧹 Bypasses Limpos')
          .setDescription('Todos os bypasses temporários foram removidos.')
        ],
        ephemeral: true
      });
      break;

    case 'all':
      // Limpar tudo
      gatekeeper.verificationSessions.clear();
      gatekeeper.verifiedUsers.clear();
      gatekeeper.bypassUsers.clear();
      await interaction.followUp({
        embeds: [new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('🧹 Limpeza Completa')
          .setDescription('Todos os dados do gatekeeper foram limpos.')
        ],
        ephemeral: true
      });
      break;
  }
}

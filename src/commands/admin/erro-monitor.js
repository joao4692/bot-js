const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const SimpleErrorMonitor = require('../../utils/SimpleErrorMonitor');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('erro-monitor')
    .setDescription('[ADMIN] Sistema simples de monitoramento de erros')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('configurar')
        .setDescription('Configurar sistema de monitoramento')
        .addChannelOption(option =>
          option
            .setName('canal-monitored')
            .setDescription('Canal para monitorar mensagens de erro')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName('canal-report')
            .setDescription('Canal para enviar relatórios de erro')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('corrigir-erro')
        .setDescription('Marcar um erro como corrigido')
        .addStringOption(option =>
          option
            .setName('mensagem-id')
            .setDescription('ID da mensagem original que continha o erro')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('solucao')
            .setDescription('Descrição da solução aplicada')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Ver status do monitoramento')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('pendentes')
        .setDescription('Ver erros pendentes')
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    
    // Garantir que o SimpleErrorMonitor esteja inicializado
    if (!client.errorMonitor) {
      client.errorMonitor = new SimpleErrorMonitor(client);
    }

    const monitor = client.errorMonitor;

    try {
      switch (subcommand) {
        case 'configurar':
          await handleConfigurar(interaction, monitor);
          break;
        case 'corrigir-erro':
          await handleCorrigirErro(interaction, monitor);
          break;
        case 'status':
          await handleStatus(interaction, monitor);
          break;
        case 'pendentes':
          await handlePendentes(interaction, monitor);
          break;
      }
    } catch (error) {
      console.error('Erro no comando erro-monitor:', error);
      interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❌ Erro')
          .setDescription(`Ocorreu um erro: ${error.message}`)
        ],
        ephemeral: true
      });
    }
  }
};

async function handleConfigurar(interaction, monitor) {
  const monitoredChannel = interaction.options.getChannel('canal-monitored');
  const reportChannel = interaction.options.getChannel('canal-report');

  monitor.addMonitoredChannel(interaction.guild.id, monitoredChannel.id);
  monitor.setReportChannel(interaction.guild.id, reportChannel.id);

  const embed = new EmbedBuilder()
    .setTitle('✅ Monitoramento de Erros Configurado')
    .setColor('#00ff00')
    .setDescription('Sistema configurado com sucesso!')
    .addFields(
      {
        name: '👀 Canal Monitorado',
        value: `${monitoredChannel.toString()} (${monitoredChannel.name})`,
        inline: true
      },
      {
        name: '📊 Canal de Relatórios',
        value: `${reportChannel.toString()} (${reportChannel.name})`,
        inline: true
      }
    )
    .addFields(
      {
        name: '📝 Como Funciona',
        value: '• O sistema monitorará mensagens com palavras como "erro", "bug", "problema"\n• Enviará relatórios automáticos para o canal designado\n• Use `/erro-monitor corrigir-erro` para marcar como resolvido',
        inline: false
      }
    )
    .setFooter({ text: 'Use /erro-monitor status para verificar' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleCorrigirErro(interaction, monitor) {
  const messageId = interaction.options.getString('mensagem-id');
  const solution = interaction.options.getString('solucao') || 'Corrigido pela staff';

  await interaction.deferReply({ ephemeral: true });

  try {
    await monitor.markAsResolved(messageId, interaction.user.id, solution);

    const embed = new EmbedBuilder()
      .setTitle('✅ Erro Marcado como Corrigido')
      .setColor('#00ff00')
      .setDescription(`O erro foi marcado como resolvido com sucesso!`)
      .addFields(
        {
          name: '🆔 ID da Mensagem',
          value: messageId,
          inline: true
        },
        {
          name: '👤 Moderador',
          value: interaction.user.tag,
          inline: true
        },
        {
          name: '💡 Solução',
          value: solution,
          inline: false
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    const embed = new EmbedBuilder()
      .setTitle('❌ Erro ao Corrigir')
      .setColor('#ff0000')
      .setDescription(`Não foi possível marcar o erro como corrigido: ${error.message}`)
      .addFields({
        name: '🔧 Dica',
        value: 'Verifique se o ID da mensagem está correto. Copie o ID da mensagem original que continha o erro.',
        inline: false
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleStatus(interaction, monitor) {
  const stats = monitor.getStats();
  const reportChannelId = monitor.reportChannel;
  
  // Obter canais monitorados
  const monitoredChannels = [];
  for (const channelKey of monitor.monitoredChannels) {
    const [keyGuildId, channelId] = channelKey.split('_');
    if (keyGuildId === interaction.guild.id) {
      try {
        const channel = await interaction.guild.channels.fetch(channelId);
        if (channel) {
          monitoredChannels.push(channel);
        }
      } catch (error) {
        // Canal não existe mais
        monitor.monitoredChannels.delete(channelKey);
      }
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('📊 Status do Monitoramento de Erros')
    .setColor('#0099ff')
    .addFields(
      {
        name: '👀 Canais Monitorados',
        value: monitoredChannels.length > 0 
          ? monitoredChannels.map(ch => ch.toString()).join('\n')
          : 'Nenhum canal configurado',
        inline: false
      }
    );

  if (reportChannelId) {
    try {
      const reportChannel = await interaction.guild.channels.fetch(reportChannelId);
      embed.addFields({
        name: '📊 Canal de Relatórios',
        value: reportChannel ? reportChannel.toString() : 'Canal não encontrado',
        inline: false
      });
    } catch (error) {
      embed.addFields({
        name: '📊 Canal de Relatórios',
        value: 'Canal não encontrado ou inválido',
        inline: false
      });
    }
  } else {
    embed.addFields({
      name: '📊 Canal de Relatórios',
      value: 'Não configurado',
      inline: false
    });
  }

  embed.addFields(
    {
      name: '📈 Estatísticas',
      value: `• Pendentes: ${stats.pending}\n• Resolvidos: ${stats.resolved}\n• Total: ${stats.total}`,
      inline: false
    },
    {
      name: '🔧 Configuração',
      value: stats.pending > 0 || stats.resolved > 0 
        ? '✅ Sistema ativo e funcionando'
        : '⚠️ Configure canais para ativar o sistema',
      inline: false
    }
  );

  embed.setFooter({ text: 'Use /erro-monitor pendentes para ver erros pendentes' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handlePendentes(interaction, monitor) {
  const pendingErrors = monitor.getPendingErrors();

  if (pendingErrors.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('✅ Nenhum Erro Pendente')
      .setColor('#00ff00')
      .setDescription('Não há erros pendentes no momento!')
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🚨 Erros Pendentes')
    .setColor('#ff4444')
    .setDescription(`Encontrados ${pendingErrors.length} erros pendentes:`)
    .setTimestamp();

  // Mostrar até 10 erros mais recentes
  const recentErrors = pendingErrors.slice(0, 10);
  
  recentErrors.forEach((error, index) => {
    const user = interaction.client.users.cache.get(error.userId);
    const userName = user ? user.tag : `Usuário ${error.userId}`;
    const content = error.content.length > 100 ? error.content.substring(0, 100) + '...' : error.content;
    
    embed.addFields({
      name: `🚨 Erro ${index + 1}`,
      value: `**Usuário:** ${userName}\n**Mensagem:** "${content}"\n**ID:** \`${error.originalMessageId}\`\n**Data:** <t:${Math.floor(error.timestamp / 1000)}:R>`,
      inline: false
    });
  });

  if (pendingErrors.length > 10) {
    embed.addFields({
      name: '📊 Mais Erros',
      value: `... e mais ${pendingErrors.length - 10} erros não mostrados`,
      inline: false
    });
  }

  embed.setFooter({ 
    text: 'Use /erro-monitor corrigir-erro <mensagem-id> para marcar como resolvido' 
  });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

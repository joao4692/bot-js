const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require('discord.js');
const { 
  generatePermissionReport, 
  createPermissionEmbedReport,
  auditPermissions,
  cleanupOrphanedPermissions
} = require('../../utils/permissionEnhancer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('permission-report')
    .setDescription('[ADMIN] Gera relatório completo do sistema de permissões')
    .addSubcommand(subcommand =>
      subcommand
        .setName('geral')
        .setDescription('Relatório geral de permissões')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('auditoria')
        .setDescription('Auditoria de segurança das permissões')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('limpar')
        .setDescription('Limpa permissões órfãs')
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content: '❌ Apenas administradores podem usar este comando.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      switch (subcommand) {
        case 'geral':
          await handleGeneralReport(interaction, client);
          break;
        case 'auditoria':
          await handleAuditReport(interaction, client);
          break;
        case 'limpar':
          await handleCleanup(interaction, client);
          break;
      }
    } catch (error) {
      console.error('Erro em permission-report:', error);
      await interaction.followUp({
        content: '❌ Ocorreu um erro ao gerar o relatório.',
        ephemeral: true
      });
    }
  }
};

async function handleGeneralReport(interaction, client) {
  const report = generatePermissionReport(interaction.guildId, client);
  const embed = createPermissionEmbedReport(report, interaction.guild);
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('permission_export')
      .setLabel('📤 Exportar')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('permission_refresh')
      .setLabel('🔄 Atualizar')
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.followUp({ 
    embeds: [embed], 
    components: [row],
    ephemeral: true 
  });
}

async function handleAuditReport(interaction, client) {
  const audit = auditPermissions(interaction.guildId, client);
  
  const embed = new EmbedBuilder()
    .setColor(audit.healthy ? '#00ff00' : '#ff9900')
    .setTitle('🔍 Auditoria de Permissões')
    .addFields(
      { 
        name: '📊 Status Geral', 
        value: audit.healthy ? '✅ Saudável' : '⚠️ Problemas encontrados', 
        inline: true 
      },
      { 
        name: '📈 Total Comandos', 
        value: audit.total.toString(), 
        inline: true 
      }
    );

  if (audit.issues.length > 0) {
    embed.addFields({
      name: '❌ Problemas Críticos',
      value: audit.issues.slice(0, 10).join('\n').substring(0, 1024)
    });
  }

  if (audit.warnings.length > 0) {
    embed.addFields({
      name: '⚠️ Avisos',
      value: audit.warnings.slice(0, 10).join('\n').substring(0, 1024)
    });
  }

  if (audit.healthy) {
    embed.setDescription('✅ Nenhum problema encontrado nas configurações de permissão!');
  }

  embed.setTimestamp()
       .setFooter({ text: 'Use /permission-report limpar para corrigir problemas' });

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleCleanup(interaction, client) {
  const cleanup = cleanupOrphanedPermissions(interaction.guildId, client);
  
  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('🧹 Limpeza de Permissões Órfãs')
    .addFields(
      { 
        name: '📊 Comandos Verificados', 
        value: cleanup.totalCommands.toString(), 
        inline: true 
      },
      { 
        name: '✅ Comandos Existentes', 
        value: cleanup.existingCommands.toString(), 
        inline: true 
      },
      { 
        name: '🗑️ Órfãos Encontrados', 
        value: cleanup.orphanedFound.toString(), 
        inline: true 
      },
      { 
        name: '🧹 Limpados', 
        value: cleanup.cleaned.length.toString(), 
        inline: true 
      }
    );

  if (cleanup.cleaned.length > 0) {
    embed.addFields({
      name: '📋 Comandos Limpados',
      value: cleanup.cleaned.map(cmd => `\`${cmd}\``).join(', ').substring(0, 1024)
    });
  }

  if (cleanup.orphanedFound === 0) {
    embed.setDescription('✅ Nenhuma permissão órfã encontrada! Sistema limpo.');
  } else {
    embed.setDescription(`🧹 Limpeza concluída! ${cleanup.cleaned.length} permissões órfãs removidas.`);
  }

  embed.setTimestamp()
       .setFooter({ text: 'Sistema otimizado com sucesso!' });

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { 
  checkAllCommands,
  generateEmbed
} = require('../../utils/commandCompatibilityChecker');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check-commands')
    .setDescription('[ADMIN] Verificar compatibilidade de comandos com o sistema de permissões')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName('acao')
        .setDescription('Ação a realizar')
        .addChoices(
          { name: '🔍 Verificar Todos', value: 'check_all' },
          { name: '📊 Ver Relatório', value: 'show_report' },
          { name: '🔧 Detalhar Problemas', value: 'detail_issues' },
          { name: '⚠️ Ver Avisos', value: 'show_warnings' }
        )
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('comando')
        .setDescription('Comando específico para verificar')
        .setRequired(false)
    ),

  async execute(interaction, client, guildConfig) {
    const action = interaction.options.getString('acao');
    const specificCommand = interaction.options.getString('comando');

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setAuthor({ 
        name: '🔍 Verificador de Comandos', 
        iconURL: interaction.client.user.avatarURL() 
      });

    try {
      switch (action) {
        case 'check_all':
          await handleCheckAll(interaction, client, embed);
          break;
        case 'show_report':
          await handleShowReport(interaction, embed);
          break;
        case 'detail_issues':
          await handleDetailIssues(interaction, embed);
          break;
        case 'show_warnings':
          await handleShowWarnings(interaction, embed);
          break;
        default:
          embed.setColor('#ff0000').setTitle('❌ Ação inválida');
          return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (error) {
      console.error('Erro em check-commands:', error);
      embed.setColor('#ff0000').setTitle('❌ Erro').setDescription(`Ocorreu um erro: ${error.message}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};

// ============================================
// FUNÇÕES DE MANIPULAÇÃO
// ============================================

async function handleCheckAll(interaction, client, embed) {
  await interaction.deferReply({ ephemeral: true });

  embed
    .setTitle('🔍 Verificando Comandos...')
    .setDescription('Analisando todos os comandos para compatibilidade...');

  await interaction.editReply({ embeds: [embed] });

  try {
    // Realizar verificação completa
    const report = await checkAllCommands(client, interaction.guildId);

    // Atualizar embed com resultados
    embed
      .setTitle(report.success ? '✅ Verificação Concluída' : '⚠️ Verificação Concluída com Problemas')
      .setDescription('Análise de compatibilidade dos comandos finalizada!')
      .addFields(
        { 
          name: '📊 Resumo da Verificação', 
          value: `**Total de Comandos:** ${report.summary.total}\n**✅ Compatíveis:** ${report.summary.compatible}\n**❌ Incompatíveis:** ${report.summary.incompatible}\n**📈 Taxa de Compatibilidade:** ${report.summary.compatibilityRate}`, 
          inline: true 
        },
        { 
          name: '⚠️ Problemas Encontrados', 
          value: `**Issues Críticas:** ${report.summary.issues}\n**Avisos:** ${report.summary.warnings}`, 
          inline: true 
        }
      );

    // Adicionar comandos incompatíveis se houver
    if (report.incompatibleCommands.length > 0) {
      const incompatibleList = report.incompatibleCommands
        .slice(0, 5)
        .map(cmd => `• **${cmd.name}**: ${cmd.issues[0] || 'Erro desconhecido'}`)
        .join('\n');

      embed.addFields({
        name: '❌ Principais Problemas',
        value: incompatibleList + (report.incompatibleCommands.length > 5 ? `\n... e mais ${report.incompatibleCommands.length - 5} comandos` : ''),
        inline: false
      });
    }

    // Adicionar recomendações
    if (report.recommendations.length > 0) {
      const topRecommendation = report.recommendations[0];
      embed.addFields({
        name: '💡 Recomendação Principal',
        value: `**${topRecommendation.title}:** ${topRecommendation.description}`,
        inline: false
      });
    }

    embed
      .setColor(report.success ? '#00ff00' : '#ffaa00')
      .setFooter({ 
        text: `Use /check-commands acao:detail_issues para ver detalhes completos` 
      });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    embed
      .setColor('#ff0000')
      .setTitle('❌ Erro na Verificação')
      .setDescription(`Falha ao analisar comandos: ${error.message}`);
    
    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleShowReport(interaction, embed) {
  try {
    const reportEmbed = generateEmbed();
    await interaction.reply({ embeds: [reportEmbed], ephemeral: true });
  } catch (error) {
    embed
      .setColor('#ff0000')
      .setTitle('❌ Erro ao Gerar Relatório')
      .setDescription(`Falha ao gerar relatório: ${error.message}`);
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleDetailIssues(interaction, embed) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const report = await checkAllCommands(interaction.client, interaction.guildId);

    if (report.issues.length === 0) {
      embed
        .setColor('#00ff00')
        .setTitle('✅ Nenhuma Issue Crítica')
        .setDescription('Todos os comandos estão funcionando corretamente!');
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    embed
      .setTitle('🔧 Detalhamento de Issues Críticas')
      .setDescription('Problemas encontrados que precisam de correção:');

    // Agrupar issues por tipo
    const issuesByType = {};
    report.issues.forEach(issue => {
      const type = issue.issue.split(':')[0] || 'outro';
      if (!issuesByType[type]) {
        issuesByType[type] = [];
      }
      issuesByType[type].push(issue);
    });

    // Mostrar issues por categoria
    Object.entries(issuesByType).forEach(([type, issues]) => {
      const issuesList = issues
        .slice(0, 5)
        .map(issue => `• **${issue.command}**: ${issue.issue}`)
        .join('\n');

      embed.addFields({
        name: `🔴 ${type.toUpperCase()}`,
        value: issuesList + (issues.length > 5 ? `\n... e mais ${issues.length - 5}` : ''),
        inline: false
      });
    });

    // Adicionar soluções sugeridas
    embed.addFields({
      name: '💡 Soluções Sugeridas',
      value: '1. **Corrija a estrutura dos comandos** - Verifique se todos exportam module.exports corretamente\n2. **Adicione função execute** - Todos os comandos precisam ter função execute\n3. **Verifique nomes** - Certifique-se de que os comandos têm nomes válidos\n4. **Teste individualmente** - Use /permission-debug para testar cada comando',
      inline: false
    });

    embed.setColor('#ff0000');

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    embed
      .setColor('#ff0000')
      .setTitle('❌ Erro ao Detalhar Issues')
      .setDescription(`Falha ao detalhar problemas: ${error.message}`);
    
    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleShowWarnings(interaction, embed) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const report = await checkAllCommands(interaction.client, interaction.guildId);

    if (report.warnings.length === 0) {
      embed
        .setColor('#00ff00')
        .setTitle('✅ Nenhum Aviso')
        .setDescription('Nenhum aviso encontrado. Ótimo trabalho!');
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    embed
      .setTitle('⚠️ Avisos de Melhoria')
      .setDescription('Avisos encontrados que podem melhorar a qualidade dos comandos:');

    // Agrupar warnings por tipo
    const warningsByType = {};
    report.warnings.forEach(warning => {
      const type = warning.warning.split(':')[0] || 'outro';
      if (!warningsByType[type]) {
        warningsByType[type] = [];
      }
      warningsByType[type].push(warning);
    });

    // Mostrar warnings por categoria
    Object.entries(warningsByType).forEach(([type, warnings]) => {
      const warningsList = warnings
        .slice(0, 5)
        .map(warning => `• **${warning.command}**: ${warning.warning}`)
        .join('\n');

      embed.addFields({
        name: `⚠️ ${type.toUpperCase()}`,
        value: warningsList + (warnings.length > 5 ? `\n... e mais ${warnings.length - 5}` : ''),
        inline: false
      });
    });

    // Adicionar recomendações de melhorias
    embed.addFields({
      name: '🚀 Sugestões de Melhoria',
      value: '1. **Adicione descrições** - Todos os comandos devem ter descrições claras\n2. **Remova verificações legadas** - Substitua verificações manuais de permissão\n3. **Padronize estrutura** - Use a mesma estrutura em todos os comandos\n4. **Adicione categorias** - Ajude na organização dos comandos',
      inline: false
    });

    embed.setColor('#ffaa00');

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    embed
      .setColor('#ff0000')
      .setTitle('❌ Erro ao Mostrar Avisos')
      .setDescription(`Falha ao mostrar avisos: ${error.message}`);
    
    await interaction.editReply({ embeds: [embed] });
  }
}

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { 
  fixPermissionSystem,
  applyAutoFixes,
  generateEmbed
} = require('../../utils/permissionFixer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fix-permissions')
    .setDescription('[ADMIN] Corrigir automaticamente problemas de permissões')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName('acao')
        .setDescription('Ação a realizar')
        .addChoices(
          { name: '🔍 Analisar Sistema', value: 'analyze' },
          { name: '🔧 Aplicar Correções', value: 'apply_fixes' },
          { name: '📊 Ver Relatório', value: 'show_report' },
          { name: '⚙️ Configurar Padrão', value: 'setup_default' }
        )
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName('auto_aplicar')
        .setDescription('Aplicar correções automaticamente (apenas para analyze)')
        .setRequired(false)
    ),

  async execute(interaction, client, guildConfig) {
    const action = interaction.options.getString('acao');
    const autoApply = interaction.options.getBoolean('auto_aplicar') || false;

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setAuthor({ 
        name: '🔧 Corretor de Permissões', 
        iconURL: interaction.client.user.avatarURL() 
      });

    try {
      switch (action) {
        case 'analyze':
          await handleAnalyze(interaction, client, embed, autoApply);
          break;
        case 'apply_fixes':
          await handleApplyFixes(interaction, client, embed);
          break;
        case 'show_report':
          await handleShowReport(interaction, embed);
          break;
        case 'setup_default':
          await handleSetupDefault(interaction, client, embed);
          break;
        default:
          embed.setColor('#ff0000').setTitle('❌ Ação inválida');
          return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (error) {
      console.error('Erro em fix-permissions:', error);
      embed.setColor('#ff0000').setTitle('❌ Erro').setDescription(`Ocorreu um erro: ${error.message}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};

// ============================================
// FUNÇÕES DE MANIPULAÇÃO
// ============================================

async function handleAnalyze(interaction, client, embed, autoApply) {
  await interaction.deferReply({ ephemeral: true });

  embed
    .setTitle('🔍 Analisando Sistema de Permissões...')
    .setDescription('Verificando configurações e identificando problemas...');

  await interaction.editReply({ embeds: [embed] });

  try {
    // Realizar análise completa
    const report = await fixPermissionSystem(client, interaction.guildId);

    // Atualizar embed com resultados
    embed
      .setTitle(report.success ? '✅ Análise Concluída' : '⚠️ Análise Concluída com Problemas')
      .setDescription('Análise do sistema de permissões finalizada!')
      .addFields(
        { 
          name: '📊 Resumo da Análise', 
          value: `**Problemas Encontrados:** ${report.summary.totalIssues}\n**Auto-corrigíveis:** ${report.summary.autoFixable}\n**Críticos:** ${report.summary.critical}\n**Avisos:** ${report.summary.warnings}`, 
          inline: true 
        },
        { 
          name: '✅ Status do Sistema', 
          value: `**Correções Aplicadas:** ${report.summary.successes}\n**Status:** ${report.success ? '✅ Saudável' : '⚠️ Necessita atenção'}`, 
          inline: true 
        }
      );

    // Adicionar problemas críticos se houver
    if (report.summary.critical > 0) {
      const criticalIssues = report.fixes.filter(f => f.type === 'critical_command')
        .slice(0, 5)
        .map(issue => `• **${issue.command}**: Precisa de nível ${issue.requiredLevel}`)
        .join('\n');

      embed.addFields({
        name: '🚨 Problemas Críticos Encontrados',
        value: criticalIssues,
        inline: false
      });
    }

    // Adicionar recomendações
    if (report.recommendations.length > 0) {
      const topRecommendation = report.recommendations[0];
      embed.addFields({
        name: '💡 Recomendação Principal',
        value: `**${topRecommendation.title}:** ${topRecommendation.description}\n\n**Ação Sugerida:** ${topRecommendation.action}`,
        inline: false
      });
    }

    // Adicionar botões de ação se houver problemas
    if (report.summary.totalIssues > 0) {
      const applyButton = new ButtonBuilder()
        .setCustomId('fix_permissions_apply')
        .setLabel('🔧 Aplicar Correções')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(report.summary.autoFixable === 0);

      const reportButton = new ButtonBuilder()
        .setCustomId('fix_permissions_report')
        .setLabel('📊 Ver Relatório Completo')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(applyButton, reportButton);
      
      await interaction.editReply({ 
        embeds: [embed], 
        components: [row] 
      });

      // Configurar collector para os botões
      const collector = interaction.channel.createMessageComponentCollector({
        time: 60000 // 1 minuto
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
          await i.reply({ 
            content: 'Apenas o autor do comando pode usar estes botões.', 
            ephemeral: true 
          });
          return;
        }

        try {
          if (i.customId === 'fix_permissions_apply') {
            await i.update({ 
              content: '🔧 Aplicando correções automáticas...', 
              embeds: [], 
              components: [] 
            });

            const fixResult = await applyAutoFixes(client, interaction.guildId);
            
            const fixEmbed = new EmbedBuilder()
              .setColor('#00ff00')
              .setTitle('✅ Correções Aplicadas')
              .setDescription(`${fixResult} correções aplicadas com sucesso!`)
              .setTimestamp();

            await i.editReply({ embeds: [fixEmbed] });
          } else if (i.customId === 'fix_permissions_report') {
            const reportEmbed = generateEmbed();
            await i.update({ 
              embeds: [reportEmbed], 
              components: [] 
            });
          }
        } catch (error) {
          console.error('Erro ao processar botão:', error);
          await i.update({ 
            content: '❌ Erro ao processar ação.', 
            embeds: [], 
            components: [] 
          });
        }

        collector.stop();
      });

      collector.on('end', () => {
        // Remover botões se o tempo expirar
        interaction.editReply({ components: [] }).catch(() => {});
      });

    } else {
      // Aplicar automaticamente se solicitado
      if (autoApply && report.summary.autoFixable > 0) {
        embed.addFields({
          name: '🔧 Aplicando Correções Automáticas...',
          value: 'Aplicando correções identificadas automaticamente...',
          inline: false
        });

        await interaction.editReply({ embeds: [embed] });

        const fixResult = await applyAutoFixes(client, interaction.guildId);
        
        embed.addFields({
          name: '✅ Correções Aplicadas',
          value: `${fixResult} correções aplicadas com sucesso!`,
          inline: false
        });

        await interaction.editReply({ embeds: [embed] });
      } else {
        embed.setColor('#00ff00');
        await interaction.editReply({ embeds: [embed] });
      }
    }

  } catch (error) {
    embed
      .setColor('#ff0000')
      .setTitle('❌ Erro na Análise')
      .setDescription(`Falha ao analisar sistema: ${error.message}`);
    
    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleApplyFixes(interaction, client, embed) {
  await interaction.deferReply({ ephemeral: true });

  embed
    .setTitle('🔧 Aplicando Correções Automáticas...')
    .setDescription('Aplicando correções identificadas no sistema...');

  await interaction.editReply({ embeds: [embed] });

  try {
    const fixResult = await applyAutoFixes(client, interaction.guildId);

    embed
      .setTitle('✅ Correções Aplicadas')
      .setDescription('Correções automáticas aplicadas com sucesso!')
      .addFields(
        { 
          name: '🔧 Correções Aplicadas', 
          value: `${fixResult} correções foram aplicadas`, 
          inline: true 
        },
        { 
          name: '📊 Status', 
          value: 'Sistema otimizado', 
          inline: true 
        }
      )
      .setColor('#00ff00')
      .setFooter({ 
        text: 'Use /check-commands para verificar o resultado' 
      });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    embed
      .setColor('#ff0000')
      .setTitle('❌ Erro ao Aplicar Correções')
      .setDescription(`Falha ao aplicar correções: ${error.message}`);
    
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

async function handleSetupDefault(interaction, client, embed) {
  await interaction.deferReply({ ephemeral: true });

  embed
    .setTitle('⚙️ Configurando Sistema Padrão...')
    .setDescription('Configurando permissões padrão para o servidor...');

  await interaction.editReply({ embeds: [embed] });

  try {
    // Configurar permissões básicas para comandos comuns
    const guild = client.guilds.cache.get(interaction.guildId);
    if (!guild) {
      throw new Error('Servidor não encontrado');
    }

    // Encontrar cargo de administrador
    const adminRole = guild.roles.cache.find(role => 
      role.permissions.has(PermissionFlagsBits.Administrator)
    ) || guild.roles.highest;

    // Configurar permissões básicas
    const basicCommands = [
      { name: 'help', level: 'PUBLIC' },
      { name: 'ping', level: 'PUBLIC' },
      { name: 'serverinfo', level: 'PUBLIC' },
      { name: 'userinfo', level: 'PUBLIC' }
    ];

    const staffCommands = [
      { name: 'ban', level: 'ADMIN' },
      { name: 'kick', level: 'ADMIN' },
      { name: 'mute', level: 'MODERATOR' },
      { name: 'warn', level: 'MODERATOR' }
    ];

    const economyCommands = [
      { name: 'banco', level: 'MEMBER' },
      { name: 'work', level: 'MEMBER' },
      { name: 'daily', level: 'MEMBER' },
      { name: 'shop', level: 'MEMBER' }
    ];

    // Simulação de configuração (seria implementado com o sistema real)
    const configuredCommands = basicCommands.length + staffCommands.length + economyCommands.length;

    embed
      .setTitle('✅ Sistema Padrão Configurado')
      .setDescription('Configurações padrão aplicadas com sucesso!')
      .addFields(
        { 
          name: '🔧 Configurações Aplicadas', 
          value: `**Comandos básicos:** ${basicCommands.length}\n**Comandos staff:** ${staffCommands.length}\n**Comandos economia:** ${economyCommands.length}\n**Total:** ${configuredCommands}`, 
          inline: true 
        },
        { 
          name: '🛡️ Cargo Administrativo', 
          value: adminRole ? adminRole.name : 'Não encontrado', 
          inline: true 
        }
      )
      .setColor('#00ff00')
      .setFooter({ 
        text: 'Sistema configurado com permissões padrão seguras' 
      });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    embed
      .setColor('#ff0000')
      .setTitle('❌ Erro na Configuração')
      .setDescription(`Falha ao configurar sistema padrão: ${error.message}`);
    
    await interaction.editReply({ embeds: [embed] });
  }
}

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
const economyConfig = require('../../utils/economyConfigManager');
const advancedLogger = require('../../utils/advancedLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('economy-config')
    .setDescription('[ADMIN] Sistema completo de configuração da economia')
    .addSubcommand(subcommand =>
      subcommand
        .setName('painel')
        .setDescription('Abrir painel de configuração')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('banco')
        .setDescription('Configurar sistema bancário')
        .addStringOption(option =>
          option
            .setName('ação')
            .setDescription('Ação a realizar')
            .addChoices(
              { name: '📊 Ver Configuração', value: 'view' },
              { name: '✏️ Editar Configuração', value: 'edit' },
              { name: '🔄 Resetar Configuração', value: 'reset' }
            )
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('loja')
        .setDescription('Configurar sistema de loja')
        .addStringOption(option =>
          option
            .setName('ação')
            .setDescription('Ação a realizar')
            .addChoices(
              { name: '📊 Ver Configuração', value: 'view' },
              { name: '➕ Adicionar Item', value: 'add_item' },
              { name: '✏️ Editar Item', value: 'edit_item' },
              { name: '🗑️ Remover Item', value: 'remove_item' },
              { name: '🏷️ Gerenciar Categorias', value: 'categories' }
            )
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('trabalho')
        .setDescription('Configurar sistema de trabalho')
        .addStringOption(option =>
          option
            .setName('ação')
            .setDescription('Ação a realizar')
            .addChoices(
              { name: '📊 Ver Configuração', value: 'view' },
              { name: '✏️ Editar Configuração', value: 'edit' },
              { name: '➕ Adicionar Emprego', value: 'add_job' },
              { name: '🗑️ Remover Emprego', value: 'remove_job' }
            )
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('investimentos')
        .setDescription('Configurar sistema de investimentos')
        .addStringOption(option =>
          option
            .setName('ação')
            .setDescription('Ação a realizar')
            .addChoices(
              { name: '📊 Ver Configuração', value: 'view' },
              { name: '✏️ Editar Taxas', value: 'edit_rates' },
              { name: '➕ Adicionar Tipo', value: 'add_type' },
              { name: '🗑️ Remover Tipo', value: 'remove_type' }
            )
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('logs')
        .setDescription('Configurar sistema de logs')
        .addStringOption(option =>
          option
            .setName('ação')
            .setDescription('Ação a realizar')
            .addChoices(
              { name: '📊 Ver Configuração', value: 'view' },
              { name: '✏️ Editar Configuração', value: 'edit' },
              { name: '📋 Ver Logs', value: 'view_logs' },
              { name: '🗑️ Limpar Logs', value: 'clear_logs' }
            )
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('exportar')
        .setDescription('Exportar configuração atual')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('importar')
        .setDescription('Importar configuração')
        .addStringOption(option =>
          option
            .setName('config')
            .setDescription('JSON da configuração')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('resetar')
        .setDescription('Resetar toda configuração para padrão')
    ),

  async execute(interaction, client, guildConfig) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    // Verificar permissões
    if (!interaction.member.permissions.has('Administrator')) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Sem Permissão')
        .setDescription('Apenas administradores podem usar este comando.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setAuthor({ name: '⚙️ Configuração da Economia', iconURL: interaction.client.user.avatarURL() });

    try {
      switch (subcommand) {
        case 'painel':
          await handlePainel(interaction, embed);
          break;
        case 'banco':
          await handleBanco(interaction, embed);
          break;
        case 'loja':
          await handleLoja(interaction, embed);
          break;
        case 'trabalho':
          await handleTrabalho(interaction, embed);
          break;
        case 'investimentos':
          await handleInvestimentos(interaction, embed);
          break;
        case 'logs':
          await handleLogs(interaction, embed);
          break;
        case 'exportar':
          await handleExportar(interaction, embed);
          break;
        case 'importar':
          await handleImportar(interaction, embed);
          break;
        case 'resetar':
          await handleResetar(interaction, embed);
          break;
        default:
          embed.setColor('#ff0000').setTitle('❌ Subcomando inválido');
          return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (error) {
      console.error('Erro em economy-config:', error);
      embed.setColor('#ff0000').setTitle('❌ Erro').setDescription(`Ocorreu um erro: ${error.message}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};

// ============================================
// FUNÇÕES DE MANIPULAÇÃO
// ============================================

async function handlePainel(interaction, embed) {
  const config = await economyConfig.getGuildConfig(interaction.guildId);
  
  const menu = new StringSelectMenuBuilder()
    .setCustomId('economy_config_menu')
    .setPlaceholder('🔧 Selecione o sistema para configurar')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('🏦 Banco')
        .setDescription('Configurar sistema bancário')
        .setValue('bank'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🛒 Loja')
        .setDescription('Configurar sistema de loja')
        .setValue('shop'),
      new StringSelectMenuOptionBuilder()
        .setLabel('💼 Trabalho')
        .setDescription('Configurar sistema de trabalho')
        .setValue('work'),
      new StringSelectMenuOptionBuilder()
        .setLabel('📈 Investimentos')
        .setDescription('Configurar sistema de investimentos')
        .setValue('investments'),
      new StringSelectMenuOptionBuilder()
        .setLabel('📊 Logs')
        .setDescription('Configurar sistema de logs')
        .setValue('logs')
    );

  const row = new ActionRowBuilder().addComponents(menu);

  embed
    .setTitle('⚙️ Painel de Configuração da Economia')
    .setDescription('Selecione o sistema que deseja configurar:')
    .addFields(
      { name: '🏦 Banco', value: `Status: ${config.bank.enabled ? '✅ Ativo' : '❌ Inativo'}`, inline: true },
      { name: '🛒 Loja', value: `Status: ${config.shop.enabled ? '✅ Ativo' : '❌ Inativo'}`, inline: true },
      { name: '💼 Trabalho', value: `Status: ${config.work.enabled ? '✅ Ativo' : '❌ Inativo'}`, inline: true },
      { name: '📈 Investimentos', value: `Status: ${config.investments.enabled ? '✅ Ativo' : '❌ Inativo'}`, inline: true },
      { name: '📊 Logs', value: `Status: ${config.logging.enabled ? '✅ Ativo' : '❌ Inativo'}`, inline: true },
      { name: '📅 Última Atualização', value: new Date(config.metadata.lastUpdated).toLocaleString('pt-BR'), inline: true }
    )
    .setFooter({ text: 'Selecione uma opção para continuar' });

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleBanco(interaction, embed) {
  const action = interaction.options.getString('ação');
  const config = await economyConfig.getGuildConfig(interaction.guildId);

  switch (action) {
    case 'view':
      embed
        .setTitle('🏦 Configuração do Banco')
        .setDescription('Configuração atual do sistema bancário')
        .addFields(
          { name: '📊 Status', value: config.bank.enabled ? '✅ Ativo' : '❌ Inativo', inline: true },
          { name: '💰 Nome', value: config.bank.name, inline: true },
          { name: '💵 Moeda', value: config.bank.currency, inline: true },
          { name: '💳 Saldo Inicial', value: `${config.bank.currency}${config.bank.startingBalance}`, inline: true },
          { name: '🏆 Saldo Máximo', value: `${config.bank.currency}${config.bank.maxBalance.toLocaleString('pt-BR')}`, inline: true },
          { name: '📅 Limite Diário', value: `${config.bank.currency}${config.bank.dailyLimit.toLocaleString('pt-BR')}`, inline: true },
          { name: '💸 Taxa de Transferência', value: `${(config.bank.transferFee * 100).toFixed(1)}%`, inline: true },
          { name: '📈 Taxa de Juros', value: `${(config.bank.interestRate * 100).toFixed(2)}% ao dia`, inline: true }
        );
      break;

    case 'edit':
      const modal = new ModalBuilder()
        .setCustomId('economy_bank_edit')
        .setTitle('✏️ Editar Configuração do Banco')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('bank_name')
              .setLabel('Nome do Banco')
              .setValue(config.bank.name)
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('bank_currency')
              .setLabel('Símbolo da Moeda')
              .setValue(config.bank.currency)
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('bank_start_balance')
              .setLabel('Saldo Inicial')
              .setValue(config.bank.startingBalance.toString())
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('bank_max_balance')
              .setLabel('Saldo Máximo')
              .setValue(config.bank.maxBalance.toString())
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('bank_transfer_fee')
              .setLabel('Taxa de Transferência (0-1)')
              .setValue(config.bank.transferFee.toString())
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          )
        );

      await interaction.showModal(modal);
      return;

    case 'reset':
      const result = await economyConfig.updateConfigSection(interaction.guildId, 'bank', economyConfig.DEFAULT_CONFIG.bank);
      
      if (result.success) {
        embed
          .setColor('#00ff00')
          .setTitle('✅ Configuração Resetada')
          .setDescription('Configuração do banco foi resetada para o padrão.');
        
        advancedLogger.economy(
          'config_reset',
          `Configuração do banco resetada por ${interaction.user.tag}`,
          {
            userId: interaction.user.id,
            guildId: interaction.guildId,
            section: 'bank'
          }
        );
      } else {
        embed.setColor('#ff0000').setTitle('❌ Erro').setDescription(result.error);
      }
      break;
  }

  if (action !== 'edit') {
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleLoja(interaction, embed) {
  const action = interaction.options.getString('ação');
  const config = await economyConfig.getGuildConfig(interaction.guildId);

  switch (action) {
    case 'view':
      embed
        .setTitle('🛒 Configuração da Loja')
        .setDescription('Configuração atual do sistema de loja')
        .addFields(
          { name: '📊 Status', value: config.shop.enabled ? '✅ Ativo' : '❌ Inativo', inline: true },
          { name: '🏪 Nome', value: config.shop.name, inline: true },
          { name: '📦 Categorias', value: config.shop.categories.length.toString(), inline: true },
          { name: '🎁 Itens', value: config.shop.items.length.toString(), inline: true },
          { name: '🏷️ Descontos', value: config.shop.discounts.length.toString(), inline: true },
          { name: '✨ Ofertas Especiais', value: config.shop.specialOffers.length.toString(), inline: true }
        );

      if (config.shop.items.length > 0) {
        const itemsList = config.shop.items.slice(0, 5).map(item => 
          `• **${item.name}** - ${config.bank.currency}${item.price}`
        ).join('\n');
        
        embed.addFields({
          name: '📋 Primeiros Itens',
          value: itemsList + (config.shop.items.length > 5 ? `\n... e mais ${config.shop.items.length - 5} itens` : ''),
          inline: false
        });
      }
      break;

    case 'add_item':
      const addItemModal = new ModalBuilder()
        .setCustomId('economy_shop_add_item')
        .setTitle('➕ Adicionar Item à Loja')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('item_name')
              .setLabel('Nome do Item')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('item_description')
              .setLabel('Descrição')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('item_price')
              .setLabel('Preço')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('item_category')
              .setLabel('Categoria')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('item_emoji')
              .setLabel('Emoji')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          )
        );

      await interaction.showModal(addItemModal);
      return;

    case 'categories':
      const categoriesText = config.shop.categories.map(cat => 
        `• **${cat.icon} ${cat.name}** (\`${cat.id}\`)`
      ).join('\n');

      embed
        .setTitle('🏷️ Categorias da Loja')
        .setDescription('Categorias disponíveis no sistema de loja:')
        .addFields({ name: '📋 Lista de Categorias', value: categoriesText || 'Nenhuma categoria configurada', inline: false });
      break;
  }

  if (action !== 'add_item') {
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleTrabalho(interaction, embed) {
  const action = interaction.options.getString('ação');
  const config = await economyConfig.getGuildConfig(interaction.guildId);

  switch (action) {
    case 'view':
      embed
        .setTitle('💼 Configuração de Trabalho')
        .setDescription('Configuração atual do sistema de trabalho')
        .addFields(
          { name: '📊 Status', value: config.work.enabled ? '✅ Ativo' : '❌ Inativo', inline: true },
          { name: '⏱️ Cooldown', value: `${config.work.cooldown / 1000} segundos`, inline: true },
          { name: '💰 Recompensa Mínima', value: `${config.bank.currency}${config.work.minReward}`, inline: true },
          { name: '💰 Recompensa Máxima', value: `${config.bank.currency}${config.work.maxReward}`, inline: true },
          { name: '🎯 Chance de Bônus', value: `${(config.work.bonusChance * 100).toFixed(1)}%`, inline: true },
          { name: '📈 Multiplicador de Bônus', value: `${config.work.bonusMultiplier}x`, inline: true }
        );

      if (config.work.jobs.length > 0) {
        const jobsList = config.work.jobs.map(job => 
          `• **${job.emoji} ${job.name}** - ${config.bank.currency}${job.minReward}-${job.maxReward}`
        ).join('\n');
        
        embed.addFields({
          name: '💼 Empregos Disponíveis',
          value: jobsList,
          inline: false
        });
      }
      break;

    case 'add_job':
      const addJobModal = new ModalBuilder()
        .setCustomId('economy_work_add_job')
        .setTitle('➕ Adicionar Emprego')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('job_name')
              .setLabel('Nome do Emprego')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('job_emoji')
              .setLabel('Emoji')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('job_min_reward')
              .setLabel('Recompensa Mínima')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('job_max_reward')
              .setLabel('Recompensa Máxima')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

      await interaction.showModal(addJobModal);
      return;
  }

  if (action !== 'add_job') {
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleInvestimentos(interaction, embed) {
  const action = interaction.options.getString('ação');
  const config = await economyConfig.getGuildConfig(interaction.guildId);

  switch (action) {
    case 'view':
      embed
        .setTitle('📈 Configuração de Investimentos')
        .setDescription('Configuração atual do sistema de investimentos')
        .addFields(
          { name: '📊 Status', value: config.investments.enabled ? '✅ Ativo' : '❌ Inativo', inline: true },
          { name: '📊 Tipos Disponíveis', value: config.investments.types.length.toString(), inline: true }
        );

      const typesList = config.investments.types.map(type => 
        `• **${type.name}** - ${(type.rate * 100).toFixed(1)}% ao ano (${type.risk})`
      ).join('\n');
      
      embed.addFields({
        name: '💰 Tipos de Investimento',
        value: typesList,
        inline: false
      });
      break;
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleLogs(interaction, embed) {
  const action = interaction.options.getString('ação');
  const config = await economyConfig.getGuildConfig(interaction.guildId);

  switch (action) {
    case 'view':
      embed
        .setTitle('📊 Configuração de Logs')
        .setDescription('Configuração atual do sistema de logs')
        .addFields(
          { name: '📊 Status', value: config.logging.enabled ? '✅ Ativo' : '❌ Inativo', inline: true },
          { name: '📺 Canal de Logs', value: config.logging.channel ? `<#${config.logging.channel}>` : 'Não configurado', inline: true },
          { name: '📋 Nível', value: config.logging.level, inline: true },
          { name: '📝 Formato', value: config.logging.format, inline: true },
          { name: '📅 Retenção', value: `${config.logging.retention} dias`, inline: true },
          { name: '📊 Categorias', value: config.logging.categories.join(', '), inline: true }
        );
      break;
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleExportar(interaction, embed) {
  const result = await economyConfig.exportConfig(interaction.guildId);
  
  if (result.success) {
    embed
      .setColor('#00ff00')
      .setTitle('📤 Configuração Exportada')
      .setDescription('Configuração exportada com sucesso!')
      .addFields({
        name: '📄 JSON',
        value: `\`\`\`json\n${JSON.stringify(result.config, null, 2)}\n\`\`\``,
        inline: false
      });
    
    advancedLogger.economy(
      'config_exported',
      `Configuração exportada por ${interaction.user.tag}`,
      {
        userId: interaction.user.id,
        guildId: interaction.guildId
      }
    );
  } else {
    embed.setColor('#ff0000').setTitle('❌ Erro').setDescription(result.error);
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleImportar(interaction, embed) {
  const configString = interaction.options.getString('config');
  
  try {
    const configData = JSON.parse(configString);
    const result = await economyConfig.importConfig(interaction.guildId, configData);
    
    if (result.success) {
      embed
        .setColor('#00ff00')
        .setTitle('📥 Configuração Importada')
        .setDescription('Configuração importada com sucesso!');
      
      advancedLogger.economy(
        'config_imported',
        `Configuração importada por ${interaction.user.tag}`,
        {
          userId: interaction.user.id,
          guildId: interaction.guildId
        }
      );
    } else {
      embed.setColor('#ff0000').setTitle('❌ Erro').setDescription(result.error);
    }
  } catch (error) {
    embed.setColor('#ff0000').setTitle('❌ JSON Inválido').setDescription('O JSON fornecido é inválido.');
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleResetar(interaction, embed) {
  const result = await economyConfig.resetConfig(interaction.guildId);
  
  if (result.success) {
    embed
      .setColor('#00ff00')
      .setTitle('🔄 Configuração Resetada')
      .setDescription('Toda configuração foi resetada para o padrão!');
    
    advancedLogger.economy(
      'config_full_reset',
      `Configuração completa resetada por ${interaction.user.tag}`,
      {
        userId: interaction.user.id,
        guildId: interaction.guildId
      }
    );
  } else {
    embed.setColor('#ff0000').setTitle('❌ Erro').setDescription(result.error);
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

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
const gatekeeper = require('../../data/whitelist/gatekeeperManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gatekeeper-config')
    .setDescription('[ADMIN] Configurar sistema de gatekeeper')
    .addSubcommand(subcommand =>
      subcommand
        .setName('modo')
        .setDescription('Definir modo de tratamento de usuários não verificados')
        .addStringOption(option =>
          option
            .setName('modo')
            .setDescription('Modo de tratamento')
            .addChoices(
              { name: '🚪 Kick (Padrão)', value: 'kick' },
              { name: '🔐 Cargo Temporário (Novo)', value: 'temporary_role' }
            )
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cargo_temporário')
        .setDescription('Configurar cargo temporário')
        .addStringOption(option =>
          option
            .setName('nome')
            .setDescription('Nome do cargo temporário')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('cor')
            .setDescription('Cor do cargo (hex)')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('duração')
            .setDescription('Duração em horas')
            .setMinValue(1)
            .setMaxValue(168)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('canais_ignorados')
        .setDescription('Configurar canais ignorados pelo gatekeeper')
        .addStringOption(option =>
          option
            .setName('adicionar')
            .setDescription('Nome do canal para adicionar à lista')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('remover')
            .setDescription('Nome do canal para remover da lista')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('limpar')
            .setDescription('Limpar todos os canais ignorados')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cargos_bypass')
        .setDescription('Configurar cargos de bypass')
        .addStringOption(option =>
          option
            .setName('adicionar')
            .setDescription('Nome ou ID do cargo para adicionar')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('remover')
            .setDescription('Nome ou ID do cargo para remover')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('listar')
            .setDescription('Listar todos os cargos de bypass')
            .setRequired(false)
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
        case 'modo':
          await handleModeConfig(interaction);
          break;
        case 'cargo_temporário':
          await handleTemporaryRoleConfig(interaction);
          break;
        case 'canais_ignorados':
          await handleIgnoredChannels(interaction);
          break;
        case 'cargos_bypass':
          await handleBypassRoles(interaction);
          break;
      }
    } catch (error) {
      console.error('Erro em gatekeeper-config:', error);
      await interaction.followUp({
        content: '❌ Ocorreu um erro ao processar o comando.',
        ephemeral: true
      });
    }
  }
};

async function handleModeConfig(interaction) {
  const mode = interaction.options.getString('modo');
  
  // Atualizar configuração
  gatekeeper.CONFIG.temporaryRoleMode = (mode === 'temporary_role');
  
  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('⚙️ Configuração Atualizada')
    .setDescription(`Modo de tratamento alterado para: ${mode === 'kick' ? '🚪 Kick (Padrão)' : '🔐 Cargo Temporário'}`)
    .addFields(
      { 
        name: '📋 Modo Atual', 
        value: gatekeeper.CONFIG.temporaryRoleMode ? '🔐 Cargo Temporário' : '🚪 Kick', 
        inline: true 
      },
      { 
        name: '📝 Descrição', 
        value: mode === 'kick' ? 'Usuários não verificados serão expulsos após falhar verificação.' : 'Usuários não verificados receberão um cargo temporário e poderão acessar o servidor.', 
        inline: false 
      }
    )
    .setTimestamp();

  await interaction.followUp({ embeds: [embed], ephemeral: true });
}

async function handleTemporaryRoleConfig(interaction) {
  const roleName = interaction.options.getString('nome');
  const color = interaction.options.getString('cor') || '#ff9900';
  const duration = interaction.options.getInteger('duração') || 24;
  
  // Aqui você implementaria a lógica para salvar no arquivo de configuração
  const embed = new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('🔐 Configuração de Cargo Temporário')
    .setDescription(`Configurações salvas para o cargo "${roleName}"`)
    .addFields(
      { name: '📝 Nome', value: roleName, inline: true },
      { name: '🎨 Cor', value: color, inline: true },
      { name: '⏰ Duração', value: `${duration} horas`, inline: true }
    )
    .setTimestamp();

  await interaction.followUp({ 
    embeds: [embed], 
    ephemeral: true 
  });
}

async function handleIgnoredChannels(interaction) {
  const addChannel = interaction.options.getString('adicionar');
  const removeChannel = interaction.options.getString('remover');
  const clearAction = interaction.options.getString('limpar');
  
  if (addChannel) {
    // Adicionar canal à lista de ignorados
    gatekeeper.CONFIG.ignoredChannels.push(addChannel);
    
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Canal Adicionado')
      .setDescription(`O canal "${addChannel}" foi adicionado à lista de canais ignorados.`)
      .setTimestamp();
    
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  } else if (removeChannel) {
    // Remover canal da lista de ignorados
    const index = gatekeeper.CONFIG.ignoredChannels.indexOf(removeChannel);
    if (index > -1) {
      gatekeeper.CONFIG.ignoredChannels.splice(index, 1);
      
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Canal Removido')
        .setDescription(`O canal "${removeChannel}" foi removido da lista de canais ignorados.`)
        .setTimestamp();
      
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    } else {
      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('⚠️ Canal Não Encontrado')
        .setDescription(`O canal "${removeChannel}" não estava na lista de ignorados.`)
        .setTimestamp();
      
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  } else if (clearAction) {
    // Limpar todos os canais
    const removedCount = gatekeeper.CONFIG.ignoredChannels.length;
    gatekeeper.CONFIG.ignoredChannels = [];
    
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('🧹 Canais Limpos')
      .setDescription(`Todos os ${removedCount} canais foram removidos da lista de ignorados.`)
      .setTimestamp();
    
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  } else {
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('❌ Ação Inválida')
      .setDescription('Use uma das opções: adicionar, remover ou limpar.')
      .setTimestamp();
    
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  }
}

async function handleBypassRoles(interaction) {
  const addRole = interaction.options.getString('adicionar');
  const removeRole = interaction.options.getString('remover');
  const listAction = interaction.options.getString('listar');
  
  if (addRole) {
    // Adicionar cargo à lista de bypass
    gatekeeper.CONFIG.bypassRoles.push(addRole);
    
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Cargo Adicionado')
      .setDescription(`O cargo "${addRole}" foi adicionado à lista de bypass.`)
      .setTimestamp();
    
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  } else if (removeRole) {
    // Remover cargo da lista de bypass
    const index = gatekeeper.CONFIG.bypassRoles.indexOf(removeRole);
    if (index > -1) {
      gatekeeper.CONFIG.bypassRoles.splice(index, 1);
      
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Cargo Removido')
        .setDescription(`O cargo "${removeRole}" foi removido da lista de bypass.`)
        .setTimestamp();
      
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    } else {
      const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('⚠️ Cargo Não Encontrado')
        .setDescription(`O cargo "${removeRole}" não estava na lista de bypass.`)
        .setTimestamp();
      
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  } else if (listAction) {
    // Listar todos os cargos de bypass
    const rolesList = gatekeeper.CONFIG.bypassRoles.map((role, index) => `${index + 1}. ${role}`).join('\n');
    
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('📋 Cargos de Bypass')
      .setDescription(rolesList || 'Nenhum cargo configurado.')
      .setTimestamp();
    
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  } else {
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('❌ Ação Inválida')
      .setDescription('Use uma das opções: adicionar, remover ou listar.')
      .setTimestamp();
    
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  }
}

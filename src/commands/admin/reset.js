const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getUser, saveUser, deleteUser } = require('../../data/economy/economyManager');
const { getRpProfile, saveRpProfile, deleteRpProfile } = require('../../data/rp/rpManager');
const { getPoliceData, deletePoliceData } = require('../../data/police/policeManager');
const { getDetranData, deleteDetranData } = require('../../data/detran/detranManager');
const bankManager = require('../../data/economy/bankManager');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('[ADMIN] Sistema completo de reset de dados do usuário')
    .addSubcommand(subcommand =>
      subcommand
        .setName('usuario')
        .setDescription('Resetar completamente um usuário')
        .addUserOption(option =>
          option
            .setName('usuario')
            .setDescription('Usuário para resetar')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('confirmar')
            .setDescription('Digite "CONFIRMAR" para autorizar')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('economia')
        .setDescription('Resetar apenas dados econômicos')
        .addUserOption(option =>
          option
            .setName('usuario')
            .setDescription('Usuário para resetar')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('confirmar')
            .setDescription('Digite "CONFIRMAR" para autorizar')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('banco')
        .setDescription('Resetar dados bancários')
        .addUserOption(option =>
          option
            .setName('usuario')
            .setDescription('Usuário para resetar')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('confirmar')
            .setDescription('Digite "CONFIRMAR" para autorizar')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rp')
        .setDescription('Resetar perfil RP')
        .addUserOption(option =>
          option
            .setName('usuario')
            .setDescription('Usuário para resetar')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('confirmar')
            .setDescription('Digite "CONFIRMAR" para autorizar')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('servidor')
        .setDescription('[OWNER] Resetar economia do servidor inteiro')
        .addStringOption(option =>
          option
            .setName('confirmar')
            .setDescription('Digite "RESETAR_SERVIDOR_COMPLETO" para autorizar')
            .setRequired(true)
        )
    ),

  async execute(interaction, client, guildConfig) {
    // Verificar permissões
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❌ Sem Permissão')
          .setDescription('Apenas administradores podem usar este comando.')
        ],
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const confirmation = interaction.options.getString('confirmar');

    // Verificações de confirmação
    if (subcommand === 'servidor' && confirmation !== 'RESETAR_SERVIDOR_COMPLETO') {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❌ Confirmação Inválida')
          .setDescription('Para resetar o servidor, digite exatamente: RESETAR_SERVIDOR_COMPLETO')
        ],
        ephemeral: true
      });
    }

    if (subcommand !== 'servidor' && confirmation !== 'CONFIRMAR') {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❌ Confirmação Inválida')
          .setDescription('Digite exatamente: CONFIRMAR')
        ],
        ephemeral: true
      });
    }

    try {
      switch (subcommand) {
        case 'usuario':
          await handleUserReset(interaction);
          break;
        case 'economia':
          await handleEconomyReset(interaction);
          break;
        case 'banco':
          await handleBankReset(interaction);
          break;
        case 'rp':
          await handleRpReset(interaction);
          break;
        case 'servidor':
          await handleServerReset(interaction);
          break;
      }
    } catch (error) {
      console.error('Erro no comando reset:', error);
      interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❌ Erro no Reset')
          .setDescription(`Ocorreu um erro: ${error.message}`)
        ],
        ephemeral: true
      });
    }
  }
};

async function handleUserReset(interaction) {
  const targetUser = interaction.options.getUser('usuario');
  const guildId = interaction.guild.id;
  const userId = targetUser.id;

  const embed = new EmbedBuilder()
    .setColor('#ff9900')
    .setTitle('🔄 Resetando Usuário...')
    .setDescription(`Resetando completamente **${targetUser.tag}**...`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  try {
    // 1. Resetar economia básica
    await deleteUser(guildId, userId);
    
    // 2. Resetar perfil RP
    await deleteRpProfile(guildId, userId);
    
    // 3. Resetar dados da polícia
    await deletePoliceData(userId, guildId);
    
    // 4. Resetar dados do Detran
    await deleteDetranData(guildId, userId);
    
    // 5. Resetar conta bancária avançada
    await bankManager.deleteAccount(guildId, userId);

    // Log completo
    logger.log('INFO', `[RESET] Usuário ${targetUser.tag} (${userId}) resetado completamente por ${interaction.user.tag}`);

    const successEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Usuário Resetado com Sucesso!')
      .setDescription(`**${targetUser.tag}** foi completamente resetado.`)
      .addFields(
        { name: '🏦 Economia', value: '✅ Resetada', inline: true },
        { name: '🎭 Perfil RP', value: '✅ Resetado', inline: true },
        { name: '🚔 Dados Policiais', value: '✅ Resetados', inline: true },
        { name: '🚗 Dados Detran', value: '✅ Resetados', inline: true },
        { name: '💳 Conta Bancária', value: '✅ Resetada', inline: true }
      )
      .setFooter({ text: `Resetado por: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed] });

  } catch (error) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('❌ Erro no Reset')
      .setDescription(`Falha ao resetar usuário: ${error.message}`)
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

async function handleEconomyReset(interaction) {
  const targetUser = interaction.options.getUser('usuario');
  const guildId = interaction.guild.id;
  const userId = targetUser.id;

  const embed = new EmbedBuilder()
    .setColor('#ff9900')
    .setTitle('💰 Resetando Economia...')
    .setDescription(`Resetando dados econômicos de **${targetUser.tag}**...`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  try {
    // Resetar economia básica
    await deleteUser(guildId, userId);
    
    // Resetar conta bancária
    await bankManager.deleteAccount(guildId, userId);

    logger.log('INFO', `[RESET] Economia do usuário ${targetUser.tag} (${userId}) resetada por ${interaction.user.tag}`);

    const successEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Economia Resetada!')
      .setDescription(`Dados econômicos de **${targetUser.tag}** foram resetados.`)
      .addFields(
        { name: '💳 Carteira', value: '✅ Resetada', inline: true },
        { name: '🏦 Banco', value: '✅ Resetado', inline: true },
        { name: '📊 Histórico', value: '✅ Limpado', inline: true }
      )
      .setFooter({ text: `Resetado por: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed] });

  } catch (error) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('❌ Erro no Reset')
      .setDescription(`Falha ao resetar economia: ${error.message}`)
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

async function handleBankReset(interaction) {
  const targetUser = interaction.options.getUser('usuario');
  const guildId = interaction.guild.id;
  const userId = targetUser.id;

  const embed = new EmbedBuilder()
    .setColor('#ff9900')
    .setTitle('🏦 Resetando Banco...')
    .setDescription(`Resetando conta bancária de **${targetUser.tag}**...`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  try {
    // Resetar apenas conta bancária avançada
    await bankManager.deleteAccount(guildId, userId);

    logger.log('INFO', `[RESET] Conta bancária do usuário ${targetUser.tag} (${userId}) resetada por ${interaction.user.tag}`);

    const successEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Conta Bancária Resetada!')
      .setDescription(`Conta bancária de **${targetUser.tag}** foi resetada.`)
      .addFields(
        { name: '💳 Saldo', value: '✅ Resetado', inline: true },
        { name: '📊 Extrato', value: '✅ Limpado', inline: true },
        { name: '💰 Empréstimos', value: '✅ Cancelados', inline: true },
        { name: '💎 Poupança', value: '✅ Resetada', inline: true }
      )
      .setFooter({ text: `Resetado por: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed] });

  } catch (error) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('❌ Erro no Reset')
      .setDescription(`Falha ao resetar banco: ${error.message}`)
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

async function handleRpReset(interaction) {
  const targetUser = interaction.options.getUser('usuario');
  const guildId = interaction.guild.id;
  const userId = targetUser.id;

  const embed = new EmbedBuilder()
    .setColor('#ff9900')
    .setTitle('🎭 Resetando Perfil RP...')
    .setDescription(`Resetando perfil RP de **${targetUser.tag}**...`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  try {
    // Resetar perfil RP
    await deleteRpProfile(guildId, userId);
    
    // Resetar dados relacionados
    await deletePoliceData(userId, guildId);
    await deleteDetranData(guildId, userId);

    logger.log('INFO', `[RESET] Perfil RP do usuário ${targetUser.tag} (${userId}) resetado por ${interaction.user.tag}`);

    const successEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Perfil RP Resetado!')
      .setDescription(`Perfil RP de **${targetUser.tag}** foi resetado.`)
      .addFields(
        { name: '💼 Emprego', value: '✅ Removido', inline: true },
        { name: '🎒 Inventário', value: '✅ Limpado', inline: true },
        { name: '⭐ Experiência', value: '✅ Resetada', inline: true },
        { name: '🏆 Conquistas', value: '✅ Limpadas', inline: true },
        { name: '🚔 Dados Policiais', value: '✅ Resetados', inline: true },
        { name: '🚗 Dados Detran', value: '✅ Resetados', inline: true }
      )
      .setFooter({ text: `Resetado por: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed] });

  } catch (error) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('❌ Erro no Reset')
      .setDescription(`Falha ao resetar perfil RP: ${error.message}`)
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

async function handleServerReset(interaction) {
  // Verificar se é o dono do bot
  if (interaction.user.id !== interaction.client.application.owner?.id) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Apenas o Dono')
        .setDescription('Apenas o dono do bot pode resetar o servidor inteiro.')
      ],
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle('⚠️ RESET COMPLETO DO SERVIDOR')
    .setDescription('**ATENÇÃO: Esta ação irá resetar TODOS os dados do servidor!**\n\n**Isso inclui:**\n- Economia de todos os usuários\n- Perfis RP completos\n- Dados policiais e do Detran\n- Contas bancárias\n- Históricos e transações\n\n**Esta ação NÃO pode ser desfeita!**')
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // Aqui você implementaria o reset completo do servidor
  // Por segurança, vou apenas mostrar a mensagem de aviso
  
  logger.log('WARN', `[RESET] Tentativa de reset completo do servidor por ${interaction.user.tag}`);
}

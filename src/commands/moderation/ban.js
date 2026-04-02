const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { addPunishment } = require("../../data/moderation/moderationManager");
const { sendLog } = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("[MOD] Bane um usuário permanentemente do servidor.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("O usuário a ser banido.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("motivo")
        .setDescription("O motivo do banimento.")
        .setRequired(false)
    )
    .addIntegerOption(option =>
        option.setName("dias_mensagens")
        .setDescription("Apagar mensagens dos últimos dias (0-7). Default: 0.")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),
  async execute(interaction, client, guildConfig) {
    const targetUser = interaction.options.getUser("usuario");
    const reason = interaction.options.getString("motivo") || 'Nenhum motivo fornecido.';
    const deleteMessageDays = interaction.options.getInteger("dias_mensagens") || 0;
    const moderator = interaction.user;

    if (targetUser.id === client.user.id || targetUser.id === moderator.id) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ff0000").setDescription('❌ Você não pode se banir ou banir o bot.')], ephemeral: true });
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (targetMember && !targetMember.bannable) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ff0000").setDescription('❌ Eu não tenho permissão para banir este usuário. Verifique minhas permissões e a hierarquia de cargos.')], ephemeral: true });
    }

    // DM the user before banning
    try {
        const dmEmbed = new EmbedBuilder()
            .setTitle('⚖️ Você foi Banido(a)')
            .setDescription(`Você foi banido(a) permanentemente do servidor **${interaction.guild.name}**.`)
            .setColor('#b30000')
            .addFields(
                { name: 'Motivo', value: reason },
                { name: 'Moderador', value: moderator.tag }
            )
            .setTimestamp();
        await targetUser.send({ embeds: [dmEmbed] });
    } catch (error) {
        console.log(`Could not DM user ${targetUser.id} before banning.`);
    }

    // Ban the user
    await interaction.guild.bans.create(targetUser.id, { 
        reason: `Banido por ${moderator.tag}. Motivo: ${reason}`,
        deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60 
    });

    // Add punishment to history
    const punishmentData = { type: 'ban', reason, moderatorId: moderator.id };
    await addPunishment(interaction.guild.id, targetUser.id, punishmentData);

    // Send log
    const logData = {
        title: '🚫 Usuário Banido',
        color: '#b30000',
        fields: [
            { name: 'Usuário', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
            { name: 'Moderador', value: `${moderator.tag} (${moderator.id})`, inline: false },
            { name: 'Motivo', value: reason, inline: false },
            { name: 'Mensagens Apagadas', value: `${deleteMessageDays} dia(s)`, inline: false },
        ]
    };
    await sendLog(client, guildConfig, logData);

    // Send confirmation message
    const embed = new EmbedBuilder()
      .setTitle("✅ Usuário Banido com Sucesso")
      .setDescription(`**${targetUser.tag}** foi banido permanentemente do servidor.`)
      .setColor("#b30000")
      .addFields({ name: 'Motivo', value: reason })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: `Banido por: ${moderator.username}`, iconURL: moderator.displayAvatarURL({ dynamic: true }) });
      
    await interaction.reply({ embeds: [embed] });
  }
};

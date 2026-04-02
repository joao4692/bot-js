const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { addPunishment } = require("../../data/moderation/moderationManager");
const { sendLog } = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("[MOD] Expulsa um usuário do servidor.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers)
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("O usuário a ser expulso.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("motivo")
        .setDescription("O motivo da expulsão.")
        .setRequired(false)
    ),
  async execute(interaction, client, guildConfig) {
    const targetUser = interaction.options.getUser("usuario");
    const reason = interaction.options.getString("motivo") || 'Nenhum motivo fornecido.';
    const moderator = interaction.user;

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ff0000").setDescription('❌ Usuário não encontrado no servidor.')], ephemeral: true });
    }

    if (targetMember.id === client.user.id || targetMember.id === moderator.id) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ff0000").setDescription('❌ Você não pode se expulsar ou expulsar o bot.')], ephemeral: true });
    }

    if (!targetMember.kickable) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ff0000").setDescription('❌ Eu não tenho permissão para expulsar este usuário. Verifique minhas permissões e a hierarquia de cargos.')], ephemeral: true });
    }

    // DM the user before kicking
    try {
        const dmEmbed = new EmbedBuilder()
            .setTitle('⚖️ Você foi Expulso(a)')
            .setDescription(`Você foi expulso(a) do servidor **${interaction.guild.name}**.`)
            .setColor('#ff4d4d')
            .addFields(
                { name: 'Motivo', value: reason },
                { name: 'Moderador', value: moderator.tag }
            )
            .setTimestamp();
        await targetUser.send({ embeds: [dmEmbed] });
    } catch (error) {
        console.log(`Could not DM user ${targetUser.id} before kicking.`);
    }

    // Kick the user
    await targetMember.kick(reason);

    // Add punishment to history
    const punishmentData = { type: 'kick', reason, moderatorId: moderator.id };
    await addPunishment(interaction.guild.id, targetUser.id, punishmentData);

    // Send log
    const logData = {
        title: '👢 Usuário Expulso',
        color: '#ff4d4d',
        fields: [
            { name: 'Usuário', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
            { name: 'Moderador', value: `${moderator.tag} (${moderator.id})`, inline: false },
            { name: 'Motivo', value: reason, inline: false },
        ]
    };
    await sendLog(client, guildConfig, logData);

    // Send confirmation message
    const embed = new EmbedBuilder()
      .setTitle("✅ Usuário Expulso com Sucesso")
      .setDescription(`**${targetUser.tag}** foi expulso do servidor.`)
      .setColor("#ff4d4d")
      .addFields({ name: 'Motivo', value: reason })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: `Expulso por: ${moderator.username}`, iconURL: moderator.displayAvatarURL({ dynamic: true }) });
      
    await interaction.reply({ embeds: [embed] });
  }
};

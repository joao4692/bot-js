const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { addPunishment } = require("../../data/moderation/moderationManager");
const { sendLog } = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("[MOD] Adverte um usuário, registrando no histórico.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("O usuário a ser advertido.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("motivo")
        .setDescription("O motivo da advertência.")
        .setRequired(true)
    ),
  async execute(interaction, client, guildConfig) {
    const targetUser = interaction.options.getUser("usuario");
    const reason = interaction.options.getString("motivo");
    const moderator = interaction.user;

    if (targetUser.bot || targetUser.id === moderator.id) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ff0000").setDescription('❌ Você não pode advertir este usuário.')], ephemeral: true });
    }

    // 1. Add punishment to history
    const punishmentData = {
        type: 'warn',
        reason: reason,
        moderatorId: moderator.id,
    };
    await addPunishment(interaction.guild.id, targetUser.id, punishmentData);

    // 2. Send log
    const logData = {
        title: '📝 Advertência Aplicada',
        color: '#f0e68c',
        fields: [
            { name: 'Usuário', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
            { name: 'Moderador', value: `${moderator.tag} (${moderator.id})`, inline: false },
            { name: 'Motivo', value: reason, inline: false },
        ]
    };
    await sendLog(client, guildConfig, logData);

    // 3. DM the user
    try {
        const dmEmbed = new EmbedBuilder()
            .setTitle('⚖️ Você foi Advertido(a)')
            .setDescription(`Você recebeu uma advertência no servidor **${interaction.guild.name}**.`)
            .setColor('#f0e68c')
            .addFields(
                { name: 'Motivo', value: reason },
                { name: 'Moderador', value: moderator.tag }
            )
            .setTimestamp();
        await targetUser.send({ embeds: [dmEmbed] });
    } catch (error) {
        console.log(`Could not DM user ${targetUser.id}.`);
        interaction.followUp({ content: `Não foi possível notificar ${targetUser.username} por DM, mas a advertência foi registrada.`, ephemeral: true });
    }

    // 4. Send confirmation message
    const embed = new EmbedBuilder()
      .setTitle("✅ Usuário Advertido com Sucesso")
      .setDescription(`**${targetUser.tag}** foi advertido.`)
      .setColor("#f0e68c")
      .addFields({ name: 'Motivo', value: reason })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: `Advertido por: ${moderator.username}`, iconURL: moderator.displayAvatarURL({ dynamic: true }) });
      
    await interaction.reply({ embeds: [embed] });
  }
};

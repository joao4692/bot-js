const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { addPunishment } = require("../../data/moderation/moderationManager");
const { sendLog } = require("../../utils/logger");
const ms = require("ms");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("[MOD] Silencia um usuário por um tempo determinado.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("O usuário a ser silenciado.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("duracao")
        .setDescription("Duração do silenciamento (ex: 10m, 1h, 7d). Max: 28 dias.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("motivo")
        .setDescription("O motivo do silenciamento.")
        .setRequired(false)
    ),
  async execute(interaction, client, guildConfig) {
    const targetUser = interaction.options.getUser("usuario");
    const durationString = interaction.options.getString("duracao");
    const reason = interaction.options.getString("motivo") || 'Nenhum motivo fornecido.';
    const moderator = interaction.user;

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ff0000").setDescription('❌ Usuário não encontrado no servidor.')], ephemeral: true });
    }

    if (targetUser.id === client.user.id || targetUser.id === moderator.id) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ff0000").setDescription('❌ Você não pode silenciar este usuário.')], ephemeral: true });
    }

    if (!targetMember.moderatable) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ff0000").setDescription('❌ Eu não posso silenciar este usuário. Verifique minhas permissões e a hierarquia de cargos.')], ephemeral: true });
    }

    const durationMs = ms(durationString);
    if (!durationMs || durationMs <= 0 || durationMs > 2419200000) { // Max 28 days
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ff0000").setDescription("❌ Por favor, forneça uma duração válida (ex: '10m', '1h', '7d'). O máximo é 28 dias.")], ephemeral: true });
    }

    // Apply timeout
    await targetMember.timeout(durationMs, `Silenciado por ${moderator.tag}. Motivo: ${reason}`);

    // Add punishment to history
    const punishmentData = { type: 'mute', reason, duration: durationString, moderatorId: moderator.id };
    await addPunishment(interaction.guild.id, targetUser.id, punishmentData);

    // Send log
    const logData = {
        title: '🔇 Usuário Silenciado',
        color: '#f0e68c',
        fields: [
            { name: 'Usuário', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
            { name: 'Moderador', value: `${moderator.tag} (${moderator.id})`, inline: false },
            { name: 'Duração', value: durationString, inline: false },
            { name: 'Motivo', value: reason, inline: false },
        ]
    };
    await sendLog(client, guildConfig, logData);

    // DM the user
    try {
        const dmEmbed = new EmbedBuilder()
            .setTitle('⚖️ Você foi Silenciado(a)')
            .setDescription(`Você foi silenciado(a) no servidor **${interaction.guild.name}**.`)
            .setColor('#f0e68c')
            .addFields(
                { name: 'Duração', value: durationString },
                { name: 'Motivo', value: reason },
                { name: 'Moderador', value: moderator.tag }
            )
            .setTimestamp();
        await targetUser.send({ embeds: [dmEmbed] });
    } catch (error) {
        console.log(`Could not DM user ${targetUser.id}.`);
    }

    // Send confirmation message
    const embed = new EmbedBuilder()
      .setTitle("✅ Usuário Silenciado com Sucesso")
      .setDescription(`**${targetUser.tag}** foi silenciado.`)
      .setColor("#f0e68c")
      .addFields(
          { name: 'Duração', value: durationString },
          { name: 'Motivo', value: reason }
      )
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: `Silenciado por: ${moderator.username}`, iconURL: moderator.displayAvatarURL({ dynamic: true }) });
      
    await interaction.reply({ embeds: [embed] });
  }
};

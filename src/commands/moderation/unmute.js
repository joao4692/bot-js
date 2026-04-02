const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { sendLog } = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("[MOD] Remove o silenciamento (timeout) de um usuário.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("O usuário para remover o silenciamento.")
        .setRequired(true)
    )
    .addStringOption(option =>
        option.setName("motivo")
          .setDescription("O motivo para remover o silenciamento.")
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

    if (!targetMember.moderatable) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ff0000").setDescription('❌ Eu não posso gerenciar este usuário. Verifique minhas permissões e a hierarquia de cargos.')], ephemeral: true });
    }

    if (!targetMember.isCommunicationDisabled()) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ffcc00").setDescription('⚠️ Este usuário não está silenciado.')], ephemeral: true });
    }

    // Remove timeout
    await targetMember.timeout(null, `Silenciamento removido por ${moderator.tag}. Motivo: ${reason}`);

    // Send log
    const logData = {
        title: '🔊 Silenciamento Removido',
        color: '#00ff00',
        fields: [
            { name: 'Usuário', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
            { name: 'Moderador', value: `${moderator.tag} (${moderator.id})`, inline: false },
            { name: 'Motivo', value: reason, inline: false },
        ]
    };
    await sendLog(client, guildConfig, logData);

    // Send confirmation message
    const embed = new EmbedBuilder()
      .setTitle("✅ Silenciamento Removido com Sucesso")
      .setDescription(`O silenciamento de **${targetUser.tag}** foi removido.`)
      .setColor("#00ff00")
      .addFields({ name: 'Motivo', value: reason })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: `Ação por: ${moderator.username}`, iconURL: moderator.displayAvatarURL({ dynamic: true }) });
      
    await interaction.reply({ embeds: [embed] });
  }
};

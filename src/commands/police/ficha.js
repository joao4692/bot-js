const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { getPoliceData } = require("../../data/police/policeManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ficha")
    .setDescription("[POLÍCIA] Consulta a ficha criminal de um usuário.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("O usuário para consultar a ficha.")
        .setRequired(true)
    ),
  async execute(interaction) {
    const targetUser = interaction.options.getUser("usuario");
    const policeData = await getPoliceData(targetUser.id, interaction.guild.id);
    const embed = new EmbedBuilder()
      .setTitle(`📋 Ficha Criminal de ${targetUser.tag}`)
      .setColor("#34495e")
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    if (!policeData.records || policeData.records.length === 0) {
      embed.setDescription("✅ Nenhum registro criminal encontrado.");
    } else {
      policeData.records.forEach(record => {
        embed.addFields({
          name: `ID: ${record.recordId.substring(0, 8)}... | Oficial: <@${record.officerId}>`,
          value: `Motivo: ${record.reason}\nData: <t:${Math.floor(new Date(record.timestamp).getTime() / 1000)}:f>`
        });
      });
    }
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

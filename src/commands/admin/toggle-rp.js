const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { saveGuildConfig } = require("../../utils/guildConfigManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("toggle-rp")
    .setDescription("[ADMIN] Ativa ou desativa o sistema de RP no servidor.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addBooleanOption(option =>
      option.setName("status")
        .setDescription("Selecione 'true' para ativar ou 'false' para desativar.")
        .setRequired(true)
    ),
  async execute(interaction, client, guildConfig) {
    const newStatus = interaction.options.getBoolean("status");

    // Ensure the rp object exists
    if (!guildConfig.rp) {
        guildConfig.rp = {};
    }

    guildConfig.rp.enabled = newStatus;
    await saveGuildConfig(interaction.guild.id, guildConfig);

    const embed = new EmbedBuilder()
      .setTitle(`🎭 Sistema de Roleplay ${newStatus ? 'Ativado' : 'Desativado'}`)
      .setDescription(`O sistema de Roleplay neste servidor foi **${newStatus ? 'ATIVADO' : 'DESATIVADO'}**.`)
      .setColor(newStatus ? "#2ecc71" : "#e74c3c")
      .setTimestamp()
      .setFooter({ text: `Configurado por: ${interaction.user.tag}` });

    interaction.reply({ embeds: [embed] });
  }
};

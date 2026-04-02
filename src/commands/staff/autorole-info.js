const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = "./src/json/data/autorole.json";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autorole-info")
    .setDescription("Exibe o cargo de autorole configurado neste servidor")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    const guildId = interaction.guild.id;

    let data = {};
    if (fs.existsSync(path)) {
      try {
        data = JSON.parse(fs.readFileSync(path, "utf-8"));
      } catch (err) {
        console.error("Erro ao ler autorole.json", err);
      }
    }

    const roleId = data[guildId];

    if (!roleId) {
      return interaction.reply({
        content: "❌ Nenhum cargo de autorole configurado neste servidor.",
        ephemeral: true
      });
    }

    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) {
      return interaction.reply({
        content: "❌ O cargo configurado não existe mais neste servidor.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('📋 Informações de AutoRole')
      .addFields(
        { name: 'Cargo', value: `<@&${role.id}>`, inline: true },
        { name: 'Nome do Cargo', value: role.name, inline: true },
        { name: 'ID do Cargo', value: roleId, inline: true }
      )
      .setDescription('Este cargo é dado automaticamente a novos membros')
      .setFooter({ text: 'Use /setautorole para alterar ou /remover-autorole para remover' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};

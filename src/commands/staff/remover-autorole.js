const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = "./src/json/data/autorole.json";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remover-autorole")
    .setDescription("Remove o cargo de autorole deste servidor")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    const guildId = interaction.guild.id;

    let data = {};
    if (fs.existsSync(path)) {
      try {
        data = JSON.parse(fs.readFileSync(path, "utf-8"));
      } catch (err) {
        console.error("Erro ao ler autorole.json", err);
        return interaction.reply({ content: "❌ Erro ao processar.", ephemeral: true });
      }
    }

    if (!data[guildId]) {
      return interaction.reply({
        content: "❌ Nenhum cargo de autorole configurado neste servidor.",
        ephemeral: true
      });
    }

    delete data[guildId];

    try {
      fs.writeFileSync(path, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Erro ao salvar autorole.json", err);
      return interaction.reply({ content: "❌ Erro ao remover.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('✅ AutoRole Removido')
      .setDescription('O cargo de autorole foi removido. Novos membros não receberão mais cargos automaticamente.')
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};

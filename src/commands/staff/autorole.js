const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const fs = require("fs");
const path = "./src/json/data/autorole.json";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setautorole")
    .setDescription("Define um cargo que novos membros receberão")
    .addRoleOption(option =>
      option.setName("cargo")
        .setDescription("Cargo a ser dado")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ Sem permissão.", ephemeral: true });
    }

    const role = interaction.options.getRole("cargo");
    const guildId = interaction.guild.id;

    // ✅ Cria a pasta src/json caso não exista
    if (!fs.existsSync("./src/json")) {
      fs.mkdirSync("./src/json", { recursive: true });
    }

    // ✅ Lê o arquivo JSON se existir, ou cria objeto vazio
    let data = {};
    if (fs.existsSync(path)) {
      try {
        data = JSON.parse(fs.readFileSync(path, "utf-8"));
      } catch (err) {
        console.error("Erro ao ler autorole.json, criando um novo.", err);
        data = {};
      }
    }

    // ✅ Salva o cargo para o servidor atual
    data[guildId] = role.id;

    // ✅ Escreve o JSON no arquivo
    fs.writeFileSync(path, JSON.stringify(data, null, 2));

    await interaction.reply(`✅ Cargo **${role.name}** definido como AutoRole neste servidor!`);
  }
};

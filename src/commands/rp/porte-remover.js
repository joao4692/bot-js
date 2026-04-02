const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const PORTE_FILE = path.join(__dirname, '../../src/data/rp/porte_armas.json');

function loadPortes() {
  if (!fs.existsSync(PORTE_FILE)) return {};
  return JSON.parse(fs.readFileSync(PORTE_FILE, 'utf8'));
}

function savePortes(data) {
  fs.writeFileSync(PORTE_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('porte-remover')
    .setDescription('Remover porte de arma de um usuário.')
    .addUserOption(option =>
      option.setName('usuario').setDescription('Usuário para remover o porte').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('registro').setDescription('Número do registro para remover (veja em /porte-consultar)').setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const registro = interaction.options.getInteger('registro');
    const portes = loadPortes();
    if (!portes[user.id] || portes[user.id].length < registro || registro < 1) {
      await interaction.reply({ content: `Registro não encontrado para ${user.tag}.`, ephemeral: true });
      return;
    }
    portes[user.id].splice(registro - 1, 1);
    if (portes[user.id].length === 0) delete portes[user.id];
    savePortes(portes);
    await interaction.reply({ content: `Registro ${registro} removido de ${user.tag}.`, ephemeral: true });
  }
};

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
    .setName('porte-registrar')
    .setDescription('Registrar porte de arma para um usuário.')
    .addUserOption(option =>
      option.setName('usuario').setDescription('Usuário para registrar o porte').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('arma').setDescription('Tipo/modelo da arma').setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const arma = interaction.options.getString('arma');
    const portes = loadPortes();
    if (!portes[user.id]) portes[user.id] = [];
    portes[user.id].push({ arma, data: new Date().toISOString() });
    savePortes(portes);
    await interaction.reply({ content: `Porte de arma registrado para ${user.tag}: ${arma}`, ephemeral: true });
  }
};

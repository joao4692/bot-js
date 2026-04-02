const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const PORTE_FILE = path.join(__dirname, '../../src/data/rp/porte_armas.json');

function loadPortes() {
  if (!fs.existsSync(PORTE_FILE)) return {};
  return JSON.parse(fs.readFileSync(PORTE_FILE, 'utf8'));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('porte-consultar')
    .setDescription('Consultar porte de arma de um usuário.')
    .addUserOption(option =>
      option.setName('usuario').setDescription('Usuário para consultar').setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const portes = loadPortes();
    const registros = portes[user.id] || [];
    if (registros.length === 0) {
      await interaction.reply({ content: `Nenhum porte de arma encontrado para ${user.tag}.`, ephemeral: true });
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle(`Portes de arma de ${user.tag}`)
      .setColor('#ffaa00')
      .setDescription(registros.map((r, i) => `**${i+1}.** ${r.arma} (Registrado em: <t:${Math.floor(new Date(r.data).getTime()/1000)}:d>)`).join('\n'));
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

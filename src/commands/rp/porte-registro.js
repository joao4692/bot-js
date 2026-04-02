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
    .setName('porte-registro')
    .setDescription('Veja todos os portes de arma registrados no servidor.'),
  async execute(interaction) {
    const portes = loadPortes();
    const users = Object.keys(portes);
    if (users.length === 0) {
      await interaction.reply({ content: 'Nenhum porte de arma registrado no servidor.', ephemeral: true });
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle('Registros de Porte de Arma')
      .setColor('#ffaa00');
    let desc = '';
    for (const userId of users) {
      const userReg = portes[userId]
        .map((r, i) => `• ${r.arma} (<t:${Math.floor(new Date(r.data).getTime()/1000)}:d>)`)
        .join('\n');
      desc += `<@${userId}>:\n${userReg}\n`;
    }
    embed.setDescription(desc);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

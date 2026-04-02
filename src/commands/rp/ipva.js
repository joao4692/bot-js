const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ipva')
    .setDescription('Registrar IPVA RP (15 dias)')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Proprietário do veículo')
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('placa')
        .setDescription('Placa do veículo')
        .setRequired(true)),

  async execute(interaction) {
    const usuario = interaction.options.getUser('usuario');
    const placa = interaction.options.getString('placa');

    const hoje = new Date();
    const validade = new Date();
    validade.setDate(hoje.getDate() + 15);

    const ipvaFilePath = path.join(__dirname, '../../json/rp/ipva.json');
    const registros = JSON.parse(fs.readFileSync(ipvaFilePath, 'utf8'));

    registros.push({
      usuarioId: usuario.id,
      usuarioTag: usuario.tag,
      placa: placa.toUpperCase(),
      validade: validade
    });

    fs.writeFileSync(ipvaFilePath, JSON.stringify(registros, null, 2));

    const embed = new EmbedBuilder()
      .setTitle('🚘 IPVA REGISTRADO')
      .setColor(0x2ECC71)
      .addFields(
        { name: '👤 Usuário', value: `${usuario.tag}`, inline: false },
        { name: '🚗 Placa', value: placa.toUpperCase(), inline: true },
        { name: '⏳ Validade', value: validade.toLocaleDateString('pt-BR'), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
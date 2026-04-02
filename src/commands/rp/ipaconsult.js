const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('consultar_ipva')
    .setDescription('Consultar IPVA pela placa')
    .addStringOption(opt =>
      opt.setName('placa')
        .setDescription('Placa do veículo')
        .setRequired(true)),

  async execute(interaction) {
    const placa = interaction.options.getString('placa').toUpperCase();
    const ipvaFilePath = path.join(__dirname, '../../json/rp/ipva.json');
    const registros = JSON.parse(fs.readFileSync(ipvaFilePath, 'utf8'));

    const registro = registros.find(r => r.placa === placa);

    if (!registro) {
      return interaction.reply({
        content: '❌ Nenhum IPVA encontrado para esta placa.',
        ephemeral: true
      });
    }

    const validade = new Date(registro.validade);
    const vencido = validade < new Date();

    const embed = new EmbedBuilder()
      .setTitle('📋 CONSULTA IPVA')
      .setColor(vencido ? 0xE74C3C : 0x3498DB)
      .addFields(
        { name: '👤 Proprietário', value: `<@${registro.usuarioId}>`, inline: false },
        { name: '🚗 Placa', value: registro.placa, inline: true },
        { name: '⏳ Validade', value: validade.toLocaleDateString('pt-BR'), inline: true },
        { name: '📌 Status', value: vencido ? '❌ VENCIDO' : '✅ VÁLIDO', inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
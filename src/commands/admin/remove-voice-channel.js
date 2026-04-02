const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");
const fs = require('fs');
const path = require('path');

const voiceConfigPath = path.join(__dirname, '../../json/voice.json');

function readVoiceConfig() {
  try {
    if (fs.existsSync(voiceConfigPath)) {
      return JSON.parse(fs.readFileSync(voiceConfigPath, 'utf-8'));
    }
  } catch (error) {
    console.error('Erro ao ler voice.json:', error);
  }
  return { voiceChannels: {} };
}

function saveVoiceConfig(data) {
  try {
    fs.writeFileSync(voiceConfigPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Erro ao salvar voice.json:', error);
    return false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove-voice-channel")
    .setDescription("Remove a configuração de canal de voz do servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guildId;

    try {
      const config = readVoiceConfig();

      if (!config.voiceChannels[guildId]) {
        return interaction.reply({
          content: "❌ Nenhum canal de voz configurado para este servidor.",
          ephemeral: true
        });
      }

      // Remover configuração
      delete config.voiceChannels[guildId];

      if (!saveVoiceConfig(config)) {
        return interaction.reply({
          content: "❌ Erro ao remover a configuração.",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('✅ Canal de Voz Removido')
        .setDescription('A configuração de canal de voz foi removida deste servidor.')
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: false
      });

    } catch (error) {
      console.error('Erro ao remover canal de voz:', error);
      return interaction.reply({
        content: "❌ Erro ao processar o comando.",
        ephemeral: true
      });
    }
  }
};

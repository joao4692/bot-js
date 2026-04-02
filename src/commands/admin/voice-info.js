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

module.exports = {
  data: new SlashCommandBuilder()
    .setName("voice-info")
    .setDescription("Exibe informações do canal de voz configurado")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const member = interaction.member;
    // Importa o gerenciador avançado de permissões
    const { checkPermission } = require('../../utils/advancedPermissionManager');

    // Verifica permissão avançada para o comando
    const permResult = checkPermission(member, guildId, 'voice-info', 'command');
    if (!permResult.allowed) {
      return interaction.reply({
        content: `❌ Permissão negada: ${permResult.reason || 'Você não pode usar este comando.'}`,
        ephemeral: true
      });
    }

    try {
      const config = readVoiceConfig();
      const voiceData = config.voiceChannels[guildId];

      if (!voiceData) {
        return interaction.reply({
          content: "❌ Nenhum canal de voz configurado para este servidor.",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📢 Informações do Canal de Voz')
        .addFields(
          { name: 'Canal', value: `<#${voiceData.channelId}>`, inline: true },
          { name: 'ID do Canal', value: voiceData.channelId, inline: true },
          { name: 'Servidor', value: voiceData.guildName, inline: true },
          { name: 'Configurado por', value: voiceData.updatedBy || 'Desconhecido', inline: true },
          { name: 'Data', value: new Date(voiceData.updatedAt).toLocaleString('pt-BR'), inline: true }
        )
        .setFooter({ text: 'Use /set-voice-channel para alterar ou /remove-voice-channel para remover' })
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: false
      });

    } catch (error) {
      console.error('Erro ao obter informações do canal de voz:', error);
      return interaction.reply({
        content: "❌ Erro ao processar o comando.",
        ephemeral: true
      });
    }
  }
};

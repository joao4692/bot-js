const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType
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
    .setName("set-voice-channel")
    .setDescription("Define o canal de voz onde o bot vai permanecer conectado")
    .addChannelOption(option =>
      option
        .setName("canal")
        .setDescription("Canal de voz para conectar")
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const voiceChannel = interaction.options.getChannel("canal");
    const guildId = interaction.guildId;

    try {
      // Ler configuração atual
      const config = readVoiceConfig();

      // Atualizar com novo canal
      config.voiceChannels[guildId] = {
        channelId: voiceChannel.id,
        channelName: voiceChannel.name,
        guildId: guildId,
        guildName: interaction.guild.name,
        updatedAt: new Date().toISOString(),
        updatedBy: interaction.user.tag
      };

      // Salvar configuração
      if (!saveVoiceConfig(config)) {
        return interaction.reply({
          content: "❌ Erro ao salvar a configuração do canal de voz.",
          ephemeral: true
        });
      }

      // Embed de sucesso
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Canal de Voz Configurado')
        .addFields(
          { name: 'Canal', value: `<#${voiceChannel.id}>`, inline: true },
          { name: 'ID do Canal', value: voiceChannel.id, inline: true },
          { name: 'Servidor', value: interaction.guild.name, inline: true }
        )
        .setFooter({ text: 'O bot entrará neste canal quando iniciar' })
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: false
      });

    } catch (error) {
      console.error('Erro ao definir canal de voz:', error);
      return interaction.reply({
        content: "❌ Erro ao processar o comando.",
        ephemeral: true
      });
    }
  }
};

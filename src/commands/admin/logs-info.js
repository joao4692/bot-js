const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");
const { readLogsConfig, LOG_DESCRIPTIONS } = require("../../utils/logManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("logs-info")
    .setDescription("Exibe todos os canais de log configurados neste servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guildId;

    try {
      const config = readLogsConfig();
      const guildConfig = config.logChannels[guildId];

      if (!guildConfig || Object.keys(guildConfig).length === 0) {
        return interaction.reply({
          content: "❌ Nenhum canal de log configurado neste servidor.",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📋 Configurações de Log')
        .setDescription(`Serão registrados neste servidor:`)
        .setFooter({ text: 'Use /set-log para adicionar ou /remove-log para remover' })
        .setTimestamp();

      // Adicionar cada log configurado
      Object.entries(guildConfig).forEach(([logType, channelId]) => {
        const description = LOG_DESCRIPTIONS[logType] || logType;
        embed.addFields({
          name: description,
          value: `<#${channelId}>`,
          inline: false
        });
      });

      return interaction.reply({
        embeds: [embed],
        ephemeral: false
      });

    } catch (error) {
      console.error('Erro ao buscar info de logs:', error);
      return interaction.reply({
        content: "❌ Erro ao processar o comando.",
        ephemeral: true
      });
    }
  }
};

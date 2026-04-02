const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} = require("discord.js");
const { LOG_TYPES, LOG_DESCRIPTIONS, setLogChannel } = require("../../utils/logManager");

// Criar opções de log type
const logTypeChoices = Object.entries(LOG_TYPES).map(([key, value]) => ({
  name: `${LOG_DESCRIPTIONS[value]} (${value})`,
  value: value
}));

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-log")
    .setDescription("Define um canal de log para um tipo de evento")
    .addStringOption(option =>
      option
        .setName("tipo")
        .setDescription("Tipo de evento para logar")
        .setRequired(true)
        .addChoices(...logTypeChoices)
    )
    .addChannelOption(option =>
      option
        .setName("canal")
        .setDescription("Canal de texto para enviar os logs")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const logType = interaction.options.getString("tipo");
    const channel = interaction.options.getChannel("canal");
    const guildId = interaction.guildId;

    try {
      if (!setLogChannel(guildId, logType, channel.id)) {
        return interaction.reply({
          content: "❌ Erro ao salvar a configuração de log.",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Canal de Log Configurado')
        .addFields(
          { name: 'Tipo de Log', value: LOG_DESCRIPTIONS[logType], inline: true },
          { name: 'Canal', value: `<#${channel.id}>`, inline: true },
          { name: 'ID do Canal', value: channel.id, inline: true }
        )
        .setFooter({ text: 'Sistema de Logs' })
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: false
      });

    } catch (error) {
      console.error('Erro ao configurar log:', error);
      return interaction.reply({
        content: "❌ Erro ao processar o comando.",
        ephemeral: true
      });
    }
  }
};

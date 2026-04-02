const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");
const { LOG_TYPES, LOG_DESCRIPTIONS, removeLogChannel } = require("../../utils/logManager");

const logTypeChoices = Object.entries(LOG_TYPES).map(([key, value]) => ({
  name: `${LOG_DESCRIPTIONS[value]} (${value})`,
  value: value
}));

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove-log")
    .setDescription("Remove a configuração de log para um tipo de evento")
    .addStringOption(option =>
      option
        .setName("tipo")
        .setDescription("Tipo de evento")
        .setRequired(true)
        .addChoices(...logTypeChoices)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const logType = interaction.options.getString("tipo");
    const guildId = interaction.guildId;

    try {
      if (!removeLogChannel(guildId, logType)) {
        return interaction.reply({
          content: "❌ Erro ao remover a configuração de log.",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('✅ Canal de Log Removido')
        .addFields(
          { name: 'Tipo de Log', value: LOG_DESCRIPTIONS[logType], inline: false }
        )
        .setDescription('O log para este tipo de evento foi removido.')
        .setFooter({ text: 'Sistema de Logs' })
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: false
      });

    } catch (error) {
      console.error('Erro ao remover log:', error);
      return interaction.reply({
        content: "❌ Erro ao processar o comando.",
        ephemeral: true
      });
    }
  }
};

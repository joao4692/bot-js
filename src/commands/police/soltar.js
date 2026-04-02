const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { getPoliceData, savePoliceData } = require("../../data/police/policeManager");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("soltar")
    .setDescription("[POLÍCIA] Soltar um usuário preso.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("Usuário a ser solto.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("motivo")
        .setDescription("Motivo da soltura (opcional)")
        .setRequired(false)
    ),

  async execute(interaction, client, guildConfig) {
    try {
      const user = interaction.options.getUser("usuario");
      const reason = interaction.options.getString("motivo") || "Sem motivo informado";

      const policeData = await getPoliceData(user.id, interaction.guild.id);

      if (!policeData?.isJailed) {
        return interaction.reply({ 
          content: "⚠️ Usuário não está preso.", 
          ephemeral: true 
        });
      }

      // Atualizar dados de prisão
      const updatedData = { ...policeData };
      updatedData.isJailed = false;
      updatedData.jailTime = null;
      updatedData.releaseReason = reason;
      updatedData.releasedBy = interaction.user.id;
      updatedData.releasedAt = new Date().toISOString();

      await savePoliceData(user.id, interaction.guild.id, updatedData);

      const embed = new EmbedBuilder()
        .setColor("#00ff00")
        .setTitle("🔓 Usuário Solto")
        .addFields(
          { name: '👤 Usuário', value: user.tag, inline: true },
          { name: '👮 Policial', value: interaction.user.tag, inline: true },
          { name: '📝 Motivo', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      
      logger.log('INFO', `[police] ${interaction.user.tag} soltou ${user.tag}. Motivo: ${reason}`);
      
      // Log em canal
      const logChannel = guildConfig?.logs?.police;
      if (logChannel) {
        const channel = await interaction.guild.channels.fetch(logChannel).catch(() => null);
        if (channel) {
          await channel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    } catch (error) {
      logger.log('ERROR', `Erro no comando soltar: ${error.message}`);
      await interaction.reply({ 
        content: '❌ Erro ao soltar usuário.', 
        ephemeral: true 
      });
    }
  }
};
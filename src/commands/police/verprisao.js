const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { getPoliceData } = require("../../data/police/policeManager");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verprisao")
    .setDescription("[POLÍCIA] Verificar status de prisão de um usuário.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("Usuário para verificar.")
        .setRequired(true)
    ),

  async execute(interaction, client, guildConfig) {
    try {
      const user = interaction.options.getUser("usuario");
      const policeData = await getPoliceData(user.id, interaction.guild.id);

      if (!policeData?.isJailed) {
        const embed = new EmbedBuilder()
          .setColor("#00ff00")
          .setTitle("✅ Usuário Livre")
          .setDescription(`${user.tag} não está preso.`);
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const releaseTime = Math.floor(policeData.jailTime / 1000);
      const embed = new EmbedBuilder()
        .setColor("#ffcc00")
        .setTitle("🔒 Status da Prisão")
        .addFields(
          { name: '👤 Usuário', value: user.tag, inline: true },
          { name: '⏳ Status', value: '🔒 Preso', inline: true },
          { name: '🕐 Soltura em', value: `<t:${releaseTime}:R>`, inline: false },
          { name: '📅 Data Exata', value: `<t:${releaseTime}:F>`, inline: false }
        )
        .setTimestamp();

      if (policeData.jailReason) {
        embed.addFields({ name: '📝 Motivo da Prisão', value: policeData.jailReason, inline: false });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
      logger.log('INFO', `[police] ${interaction.user.tag} verificou prisão de ${user.tag}`);
    } catch (error) {
      logger.log('ERROR', `Erro no comando verprisao: ${error.message}`);
      await interaction.reply({ 
        content: '❌ Erro ao verificar prisão.', 
        ephemeral: true 
      });
    }
  }
};
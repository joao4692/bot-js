const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { getPoliceData } = require("../../data/police/policeManager");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cela")
    .setDescription("[POLÍCIA] Ver informações detalhadas da cela de um preso.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("Usuário preso.")
        .setRequired(true)
    ),

  async execute(interaction, client, guildConfig) {
    try {
      const user = interaction.options.getUser("usuario");
      const policeData = await getPoliceData(user.id, interaction.guild.id);

      if (!policeData?.isJailed) {
        const embed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("⚠️ Cela Vazia")
          .setDescription(`${user.tag} não está preso.`);
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const releaseTime = Math.floor(policeData.jailTime / 1000);
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = Math.max(releaseTime - now, 0);

      let timeLeftStr = '';
      if (timeLeft > 0) {
        const days = Math.floor(timeLeft / 86400);
        const hours = Math.floor((timeLeft % 86400) / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;
        timeLeftStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      } else {
        timeLeftStr = '00d 00h 00m 00s (Elegível para liberação)';
      }

      const embed = new EmbedBuilder()
        .setColor("#c0392b")
        .setTitle("🏢 Informações da Cela")
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '👤 Preso', value: user.tag, inline: true },
          { name: '🏚️ Cela', value: 'Cela-01', inline: true },
          { name: '⏳ Tempo Restante', value: timeLeftStr, inline: false },
          { name: '🕐 Será liberado em', value: `<t:${releaseTime}:F>`, inline: false }
        );

      if (policeData.jailReason) {
        embed.addFields({ name: '📝 Motivo da Prisão', value: policeData.jailReason, inline: false });
      }

      if (policeData.jailedBy) {
        embed.addFields({ name: '👮 Preso por (ID)', value: `<@${policeData.jailedBy}>`, inline: false });
      }

      if (policeData.fines && policeData.fines.length > 0) {
        const unpaidFines = policeData.fines.filter(f => !f.paid).length;
        embed.addFields({ name: '💰 Multas Pendentes', value: `${unpaidFines} multa(s)`, inline: true });
      }

      embed.setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      logger.log('INFO', `[police] ${interaction.user.tag} verificou cela de ${user.tag}`);
    } catch (error) {
      logger.log('ERROR', `Erro no comando cela: ${error.message}`);
      await interaction.reply({ 
        content: '❌ Erro ao verificar cela.', 
        ephemeral: true 
      });
    }
  }
};
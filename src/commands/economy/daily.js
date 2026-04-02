const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getUser, saveUser, addTransaction } = require("../../data/economy/economyManager");
const ms = require('ms');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Resgate sua recompensa diária."),
  async execute(interaction, client, guildConfig) {
    try {
      const mode = guildConfig.economy?.mode || 'local';
      const now = Date.now();
      const cooldownTime = (guildConfig.dailyCooldown || 86400) * 1000;
      let lastDaily = 0;
      let reward = guildConfig.economy.dailyReward || 100;
      const currency = guildConfig.economy.currency || '💰';

      const user = await getUser(interaction.guild.id, interaction.user.id, guildConfig);
      lastDaily = user.lastDaily || 0;
      if (lastDaily && now - lastDaily < cooldownTime) {
        const remaining = user.lastDaily + cooldownTime - now;
        const expiredTimestamp = Math.round((user.lastDaily + cooldownTime) / 1000);
        const embed = new EmbedBuilder()
          .setTitle("⏰ Aguarde!")
          .setDescription(`Você já recebeu sua recompensa diária. Tente novamente em **${ms(remaining, { long: true })}**.\nPróximo daily em: <t:${expiredTimestamp}:R>`)
          .setColor("#ffcc00");
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const randomCfg = guildConfig.economy?.dailyRandom;
      if (randomCfg?.enabled) {
        const min = Number.isFinite(randomCfg.min) ? randomCfg.min : 150;
        const max = Number.isFinite(randomCfg.max) ? randomCfg.max : 300;
        const cap = Number.isFinite(randomCfg.cap) ? randomCfg.cap : 400;
        const base = Math.floor(Math.random() * (max - min + 1)) + min;
        reward = Math.min(base, cap);
      }

      user.wallet = (user.wallet || 0) + reward;
      user.lastDaily = now;
      await addTransaction(interaction.guild.id, interaction.user.id, guildConfig, 'daily', reward, 'Recompensa diária');
      await saveUser(interaction.guild.id, interaction.user.id, guildConfig, user);

      const embed = new EmbedBuilder()
        .setTitle("🎁 Recompensa Diária Recebida!")
        .setDescription(`Você coletou sua recompensa e ganhou **${currency} ${reward.toLocaleString('pt-BR')}**!`)
        .setColor(guildConfig.embedColor || '#00ff00')
        .setTimestamp()
        .setFooter({ text: `Executado por: ${interaction.user.username}` });

      interaction.reply({ embeds: [embed] });
      logger.log('INFO', `[daily] Recompensa diária (${mode}): ${interaction.user.tag} +${reward}`);
    } catch (err) {
      logger.log('ERROR', `Erro no comando daily: ${err.message}`);
      await interaction.reply({ content: 'Erro ao processar daily.', ephemeral: true });
    }
  }
};

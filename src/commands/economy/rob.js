const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getUser, saveUser, addTransaction } = require("../../data/economy/economyManager");
const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rob")
    .setDescription("Tente roubar dinheiro da carteira de outro usuário.")
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("O usuário que você tentará roubar.")
        .setRequired(true)
    ),
  cooldown: 1800, // 30 minutes in seconds
  async execute(interaction, client, guildConfig) {
    const targetUser = interaction.options.getUser("usuario");
    const robber = interaction.user;

    if (targetUser.bot || targetUser.id === robber.id) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ff0000").setDescription('❌ Você não pode roubar este usuário.')], ephemeral: true });
    }

    const robberData = await getUser(interaction.guild.id, robber.id, guildConfig);
    const targetData = await getUser(interaction.guild.id, targetUser.id, guildConfig);
    const currency = guildConfig.economy.currency || '💰';

    const now = Date.now();
    const cooldownTime = (this.cooldown || 1800) * 1000;

    if (robberData.lastRob && now - robberData.lastRob < cooldownTime) {
        const remaining = robberData.lastRob + cooldownTime - now;
        const expiredTimestamp = Math.round((robberData.lastRob + cooldownTime) / 1000);
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ffcc00").setTitle("⏳ Acalme-se, ladrão!").setDescription(`Você já tentou um roubo recentemente. Tente novamente em **${ms(remaining, { long: true })}**.\nPróxima tentativa em: <t:${expiredTimestamp}:R>`)], ephemeral: true });
    }

    const targetWallet = targetData.wallet || 0;
    if (targetWallet < 100) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ffcc00").setDescription(`⚠️ **${targetUser.username}** não tem dinheiro suficiente na carteira para valer o risco.`)], ephemeral: true });
    }

    robberData.lastRob = now;

    const robChance = guildConfig.economy.robChance || 0.4;
    const isSuccess = Math.random() < robChance;

    if (isSuccess) {
        const stolenAmount = Math.floor(targetWallet * (Math.random() * 0.25 + 0.05)); // Steal 5% to 30%
        
        robberData.wallet = (robberData.wallet || 0) + stolenAmount;
        targetData.wallet -= stolenAmount;

        // Integrar com histórico de compras e leaderboard
        if (!robberData.robHistory) robberData.robHistory = [];
        robberData.robHistory.push({
          type: 'success',
          target: targetUser.id,
          value: stolenAmount,
          date: Date.now()
        });
        if (robberData.robHistory.length > 100) robberData.robHistory = robberData.robHistory.slice(-100);

        if (!targetData.robbedHistory) targetData.robbedHistory = [];
        targetData.robbedHistory.push({
          type: 'loss',
          from: robber.id,
          value: stolenAmount,
          date: Date.now()
        });
        if (targetData.robbedHistory.length > 100) targetData.robbedHistory = targetData.robbedHistory.slice(-100);

        await addTransaction(interaction.guild.id, robber.id, guildConfig, 'rob-success', stolenAmount, `Roubou de ${targetUser.username}`);
        await addTransaction(interaction.guild.id, targetUser.id, guildConfig, 'robbed', -stolenAmount, `Roubado por ${robber.username}`);

        await saveUser(interaction.guild.id, robber.id, guildConfig, robberData);
        await saveUser(interaction.guild.id, targetUser.id, guildConfig, targetData);

        // Log admin
        const logChannel = guildConfig?.logs?.rob;
        if (logChannel) {
          const channel = interaction.guild.channels.cache.get(logChannel);
          if (channel) {
            channel.send({ content: `🚨 ${robber.tag} roubou ${currency} ${stolenAmount.toLocaleString('pt-BR')} de ${targetUser.tag}` });
          }
        }

        const embed = new EmbedBuilder()
            .setTitle("✅ Roubo Bem-Sucedido!")
            .setDescription(`Você foi mais esperto e conseguiu roubar **${currency} ${stolenAmount.toLocaleString('pt-BR')}** de **${targetUser.username}**!`)
            .setColor("#00ff00")
            .setThumbnail(robber.displayAvatarURL({ dynamic: true }))
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });

    } else {
        const penalty = Math.floor((robberData.wallet || 0) * 0.15); // Lose 15% of wallet as penalty

        robberData.wallet -= penalty;

        await addTransaction(interaction.guild.id, robber.id, guildConfig, 'rob-fail', -penalty, 'Multa por tentativa de roubo falha');
        await saveUser(interaction.guild.id, robber.id, guildConfig, robberData);

        const embed = new EmbedBuilder()
            .setTitle("❌ Roubo Falhou!")
            .setDescription(`Você foi pego tentando roubar **${targetUser.username}**! Como punição, você perdeu **${currency} ${penalty.toLocaleString('pt-BR')}**.`)
            .setColor("#ff0000")
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }
  }
};

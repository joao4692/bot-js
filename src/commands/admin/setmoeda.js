const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { saveGuildConfig } = require("../../utils/guildConfigManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setmoeda")
    .setDescription("[ADMIN] Define o símbolo da moeda para o servidor.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addStringOption(option =>
      option.setName("simbolo")
        .setDescription("O novo símbolo da moeda (ex: R$, $, 💰).")
        .setRequired(true)
    ),
  async execute(interaction, client, guildConfig) {
    const newCurrency = interaction.options.getString("simbolo");
    const oldCurrency = guildConfig.economy.currency || 'Não definida';

    guildConfig.economy.currency = newCurrency;
    await saveGuildConfig(interaction.guild.id, guildConfig);

    const embed = new EmbedBuilder()
      .setTitle("💰 Moeda do Servidor Atualizada")
      .setDescription(`O símbolo da moeda do servidor foi alterado com sucesso.`)
      .addFields(
          { name: 'Moeda Antiga', value: oldCurrency, inline: true },
          { name: 'Nova Moeda', value: newCurrency, inline: true }
      )
      .setColor("#2ecc71")
      .setTimestamp()
      .setFooter({ text: `Alterado por: ${interaction.user.tag}` });

    interaction.reply({ embeds: [embed] });
  }
};

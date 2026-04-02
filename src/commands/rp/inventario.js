const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getRpProfile } = require("../../data/rp/rpManager");
const { createSelectMenu } = require("../../utils/helpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inventario")
    .setDescription("[RP] Mostra o seu inventário ou o de outro usuário.")
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("O usuário para ver o inventário. Deixe em branco para ver o seu.")
        .setRequired(false)
    ),
  async execute(interaction, client, guildConfig) {
    if (!guildConfig.rp || !guildConfig.rp.enabled) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ff0000").setDescription('❌ O sistema de RP está desativado neste servidor.')], ephemeral: true });
    }

    const targetUser = interaction.options.getUser("usuario") || interaction.user;
    const rpProfile = await getRpProfile(interaction.guild.id, targetUser.id);

    const embed = new EmbedBuilder()
      .setTitle(`🎒 Inventário de ${targetUser.username}`)
      .setColor(guildConfig.embedColor || '#996633')
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    if (!rpProfile.inventory || rpProfile.inventory.length === 0) {
        embed.setDescription('O inventário está vazio. Use `/loja` para comprar itens!');
        // Log admin
        const logChannel = guildConfig?.logs?.inventory;
        if (logChannel) {
            const channel = interaction.guild.channels.cache.get(logChannel);
            if (channel) {
                channel.send({ content: `📦 ${interaction.user.tag} consultou inventário vazio.` });
            }
        }
        return interaction.reply({ embeds: [embed] });
    }

    // Criar menu de seleção para itens
    const itemOptions = rpProfile.inventory.map((item, index) => ({
      label: `${item.name} (x${item.quantity})`,
      description: `Quantidade: ${item.quantity}`,
      value: `item_${index}`
    }));

    const row = createSelectMenu(`inventory_select_${targetUser.id}`, itemOptions, 'Selecione um item para ver detalhes');

    const inventoryString = rpProfile.inventory
        .map(item => `› **${item.name}** — Quantidade: ${item.quantity}`)
        .join('\n');
    embed.setDescription(inventoryString);

    interaction.reply({ embeds: [embed], components: [row] });
  }
};

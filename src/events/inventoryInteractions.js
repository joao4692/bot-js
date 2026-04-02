const { Events, EmbedBuilder } = require('discord.js');
const { getRpProfile } = require('../data/rp/rpManager');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            if (!interaction.isStringSelectMenu()) return;
            if (!interaction.customId.startsWith('inventory_select_')) return;

            if (!interaction.inGuild()) {
                return interaction.reply({ content: 'Este menu só funciona em servidor.', ephemeral: true });
            }

            const targetUserId = interaction.customId.replace('inventory_select_', '');
            const value = interaction.values?.[0] || '';
            const match = value.match(/^item_(\d+)$/);
            if (!match) {
                return interaction.reply({ content: 'Seleção inválida.', ephemeral: true });
            }

            const idx = Number(match[1]);
            const rpProfile = await getRpProfile(interaction.guild.id, targetUserId);
            const items = Array.isArray(rpProfile.inventory) ? rpProfile.inventory : [];

            if (Number.isNaN(idx) || idx < 0 || idx >= items.length) {
                return interaction.reply({ content: 'Item inválido.', ephemeral: true });
            }

            const item = items[idx];
            const embed = new EmbedBuilder()
                .setColor('#996633')
                .setTitle(`📦 ${item.name || 'Item'}`)
                .setDescription(`Quantidade: **${item.quantity ?? 0}**\nID: \`${item.itemId || 'N/A'}\``);

            return interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (e) {
            console.error('[inventoryInteractions] Erro:', e);
            if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
                await interaction.reply({ content: '❌ Erro ao processar inventário.', ephemeral: true }).catch(() => null);
            }
        }
    }
};

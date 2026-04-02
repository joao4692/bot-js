const { Events, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');
const { getUser, writeDB } = require('../utils/detranDB');

const COLORS = {
    success: '#2ecc71',
    error: '#e74c3c',
    warn: '#f1c40f',
    info: '#3498db'
};

function generateCNH() {
    // mesmo range do comando
    return crypto.randomInt(10000000000, 99999999999).toString();
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            if (!interaction.isStringSelectMenu()) return;
            if (!interaction.customId.startsWith('cnh_category_select_')) return;
            if (!interaction.inGuild()) {
                return interaction.reply({ content: 'Este menu só funciona em servidor.', ephemeral: true });
            }

            // customId: cnh_category_select_<targetId>_<adminId>
            const parts = interaction.customId.split('_');
            const targetId = parts[3];
            const adminId = parts[4];

            if (!targetId || !adminId) {
                return interaction.reply({ content: 'Seleção inválida.', ephemeral: true });
            }

            if (interaction.user.id !== adminId) {
                return interaction.reply({ content: '❌ Apenas o admin que iniciou pode escolher a categoria.', ephemeral: true });
            }

            const category = interaction.values?.[0];
            if (!category) {
                return interaction.reply({ content: 'Categoria inválida.', ephemeral: true });
            }

            const { db, user } = getUser(interaction.guild.id, targetId);
            if (user.cnh?.issued) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(COLORS.warn).setDescription('⚠️ Este usuário já possui CNH.')],
                    ephemeral: true
                });
            }

            user.cnh = {
                issued: true,
                number: generateCNH(),
                category,
                points: 0,
                issuer: adminId,
                issuedAt: Date.now()
            };

            writeDB(db);

            const embed = new EmbedBuilder()
                .setColor(COLORS.success)
                .setTitle('✅ CNH emitida')
                .setDescription(`Usuário: <@${targetId}>\nCategoria: **${category}**\nNúmero: \`${user.cnh.number}\``)
                .setFooter({ text: `Por ${interaction.user.tag}` })
                .setTimestamp();

            return interaction.update({ embeds: [embed], components: [] });
        } catch (e) {
            console.error('[cnhInteractions] Erro:', e);
            if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
                await interaction.reply({ content: '❌ Erro ao processar CNH.', ephemeral: true }).catch(() => null);
            }
        }
    }
};

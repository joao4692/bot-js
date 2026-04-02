const { Events, EmbedBuilder } = require('discord.js');
const { getDetranData, saveDetranData } = require('../data/detran/detranManager');

function safeNumber(input) {
    const n = Number(String(input || '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : null;
}

function makeId(prefix = 'ID') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            if (!interaction.isModalSubmit()) return;

            const customId = interaction.customId;

            // /veiculo registrar
            if (customId.startsWith('veiculo_registrar_')) {
                const ownerId = customId.replace('veiculo_registrar_', '');
                if (!interaction.inGuild()) {
                    return interaction.reply({ content: 'Este modal só funciona em servidor.', ephemeral: true });
                }

                const model = interaction.fields.getTextInputValue('modelo')?.trim();
                const color = interaction.fields.getTextInputValue('cor')?.trim() || null;
                const year = interaction.fields.getTextInputValue('ano')?.trim() || null;

                if (!model) {
                    return interaction.reply({ content: '❌ Modelo é obrigatório.', ephemeral: true });
                }

                const detranData = await getDetranData(interaction.guild.id, ownerId);
                detranData.vehicles ??= [];

                // gerar placa simples (mesmo padrão do comando, porém sem reusar função local)
                const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                const numbers = '0123456789';
                const plate = (
                    letters[Math.floor(Math.random() * 26)] +
                    letters[Math.floor(Math.random() * 26)] +
                    letters[Math.floor(Math.random() * 26)] +
                    ' ' +
                    numbers[Math.floor(Math.random() * 10)] +
                    numbers[Math.floor(Math.random() * 10)] +
                    numbers[Math.floor(Math.random() * 10)] +
                    numbers[Math.floor(Math.random() * 10)]
                );

                detranData.vehicles.push({
                    plate,
                    model,
                    color,
                    year,
                    ownerId,
                    inGarage: true,
                    timestamp: Date.now()
                });

                await saveDetranData(interaction.guild.id, ownerId, detranData);

                const embed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('✅ Veículo registrado')
                    .setDescription(`Proprietário: <@${ownerId}>\nPlaca: \`${plate}\`\nModelo: **${model}**`);

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // /multas aplicar
            if (customId.startsWith('multa_aplicar_')) {
                const targetId = customId.replace('multa_aplicar_', '');
                if (!interaction.inGuild()) {
                    return interaction.reply({ content: 'Este modal só funciona em servidor.', ephemeral: true });
                }

                const motivo = interaction.fields.getTextInputValue('motivo')?.trim();
                const valorRaw = interaction.fields.getTextInputValue('valor')?.trim();
                const valor = safeNumber(valorRaw);

                if (!motivo) {
                    return interaction.reply({ content: '❌ Motivo é obrigatório.', ephemeral: true });
                }
                if (valor == null || valor <= 0) {
                    return interaction.reply({ content: '❌ Valor inválido.', ephemeral: true });
                }

                const detranData = await getDetranData(interaction.guild.id, targetId);
                detranData.multas ??= [];

                const id = makeId('MULTA');
                detranData.multas.push({
                    id,
                    motivo,
                    valor,
                    paga: false,
                    issuedBy: interaction.user.id,
                    issuedAt: Date.now()
                });

                await saveDetranData(interaction.guild.id, targetId, detranData);

                const embed = new EmbedBuilder()
                    .setColor('#ffcc00')
                    .setTitle('✅ Multa aplicada')
                    .setDescription(`Usuário: <@${targetId}>\nID: \`${id}\`\nValor: **R$ ${valor}**\nMotivo: **${motivo}**`);

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (e) {
            console.error('[detranInteractions] Erro:', e);
            if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
                await interaction.reply({ content: '❌ Erro ao processar interação do DETRAN.', ephemeral: true }).catch(() => null);
            }
        }
    }
};

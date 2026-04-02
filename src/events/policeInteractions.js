const { Events, EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const ms = require('ms');
const { getPoliceData, savePoliceData } = require('../data/police/policeManager');

function buildFineModal(targetId) {
    const modal = new ModalBuilder()
        .setCustomId(`policia_multar_modal_${targetId}`)
        .setTitle('Aplicar Multa (Polícia)');

    const motivo = new TextInputBuilder()
        .setCustomId('motivo')
        .setLabel('Motivo')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const valor = new TextInputBuilder()
        .setCustomId('valor')
        .setLabel('Valor (R$)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10);

    modal.addComponents(
        new ActionRowBuilder().addComponents(motivo),
        new ActionRowBuilder().addComponents(valor)
    );

    return modal;
}

function buildJailModal(targetId) {
    const modal = new ModalBuilder()
        .setCustomId(`policia_prender_modal_${targetId}`)
        .setTitle('Prender (Polícia)');

    const tempo = new TextInputBuilder()
        .setCustomId('tempo')
        .setLabel('Tempo (ex: 10m, 2h, 1d)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(20);

    const motivo = new TextInputBuilder()
        .setCustomId('motivo')
        .setLabel('Motivo')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const fianca = new TextInputBuilder()
        .setCustomId('fianca')
        .setLabel('Fiança (0 para nenhuma)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(12);

    modal.addComponents(
        new ActionRowBuilder().addComponents(tempo),
        new ActionRowBuilder().addComponents(motivo),
        new ActionRowBuilder().addComponents(fianca)
    );

    return modal;
}

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
            if (interaction.isButton()) {
                const id = interaction.customId;

                if (id.startsWith('policia_multar_')) {
                    const targetId = id.replace('policia_multar_', '');
                    return interaction.showModal(buildFineModal(targetId));
                }

                if (id === 'policia_cancelar_multa') {
                    const embed = new EmbedBuilder().setColor('#f39c12').setTitle('⛔ Cancelado').setDescription('A multa foi cancelada.');
                    return interaction.update({ embeds: [embed], components: [] });
                }

                if (id.startsWith('policia_prender_')) {
                    const targetId = id.replace('policia_prender_', '');
                    return interaction.showModal(buildJailModal(targetId));
                }

                if (id === 'policia_cancelar_prisao') {
                    const embed = new EmbedBuilder().setColor('#f39c12').setTitle('⛔ Cancelado').setDescription('A prisão foi cancelada.');
                    return interaction.update({ embeds: [embed], components: [] });
                }
            }

            if (interaction.isModalSubmit()) {
                const id = interaction.customId;

                if (id.startsWith('policia_multar_modal_')) {
                    const targetId = id.replace('policia_multar_modal_', '');
                    const motivo = interaction.fields.getTextInputValue('motivo')?.trim();
                    const valor = safeNumber(interaction.fields.getTextInputValue('valor')?.trim());

                    if (!interaction.inGuild()) {
                        return interaction.reply({ content: 'Este modal só funciona em servidor.', ephemeral: true });
                    }
                    if (!motivo) return interaction.reply({ content: '❌ Motivo obrigatório.', ephemeral: true });
                    if (valor == null || valor <= 0) return interaction.reply({ content: '❌ Valor inválido.', ephemeral: true });

                    const policeData = await getPoliceData(targetId, interaction.guild.id);
                    policeData.fines ??= [];

                    const fineId = makeId('FINE');
                    policeData.fines.push({
                        fineId,
                        reason: motivo,
                        value: valor,
                        // compat extras
                        issuedBy: interaction.user.id,
                        issuedAt: Date.now()
                    });

                    await savePoliceData(targetId, interaction.guild.id, policeData);

                    const embed = new EmbedBuilder()
                        .setColor('#e67e22')
                        .setTitle('✅ Multa aplicada (Polícia)')
                        .setDescription(`Usuário: <@${targetId}>\nID: \`${fineId}\`\nValor: **R$ ${valor}**\nMotivo: **${motivo}**`);

                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                if (id.startsWith('policia_prender_modal_')) {
                    const targetId = id.replace('policia_prender_modal_', '');
                    const tempoRaw = interaction.fields.getTextInputValue('tempo')?.trim();
                    const motivo = interaction.fields.getTextInputValue('motivo')?.trim();
                    const fianca = safeNumber(interaction.fields.getTextInputValue('fianca')?.trim()) || 0;

                    if (!interaction.inGuild()) {
                        return interaction.reply({ content: 'Este modal só funciona em servidor.', ephemeral: true });
                    }

                    const durationMs = ms(tempoRaw);
                    if (!durationMs || durationMs < 1000) {
                        return interaction.reply({ content: '❌ Tempo inválido. Use exemplo: 10m, 2h, 1d', ephemeral: true });
                    }
                    if (!motivo) return interaction.reply({ content: '❌ Motivo obrigatório.', ephemeral: true });

                    const policeData = await getPoliceData(targetId, interaction.guild.id);
                    if (policeData.isJailed) {
                        return interaction.reply({ content: '⚠️ O usuário já está preso.', ephemeral: true });
                    }

                    policeData.isJailed = true;
                    policeData.jailReason = motivo;
                    policeData.jailedBy = interaction.user.id;
                    policeData.jailedAt = Date.now();
                    policeData.jailTime = Date.now() + durationMs;
                    policeData.bail = fianca;

                    await savePoliceData(targetId, interaction.guild.id, policeData);

                    const embed = new EmbedBuilder()
                        .setColor('#c0392b')
                        .setTitle('⛓️ Prisão aplicada')
                        .setDescription(`Usuário: <@${targetId}>\nTempo: **${tempoRaw}**\nMotivo: **${motivo}**\nSoltura: <t:${Math.floor(policeData.jailTime / 1000)}:R>`);

                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }
        } catch (e) {
            console.error('[policeInteractions] Erro:', e);
            if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
                await interaction.reply({ content: '❌ Erro ao processar interação da polícia.', ephemeral: true }).catch(() => null);
            }
        }
    }
};

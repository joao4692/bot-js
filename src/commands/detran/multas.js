const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { getDetranData, saveDetranData } = require("../../data/detran/detranManager");

const COLORS = {
    success: "#2ecc71",
    error: "#e74c3c",
    warn: "#f1c40f",
    info: "#3498db"
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("multas")
        .setDescription("[DETRAN] Gerencie multas dos usuários.")
        // .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // REMOVIDO - Agora todos podem usar
        .addSubcommand(sub =>
            sub.setName("aplicar")
                .setDescription("Aplica uma multa a um usuário.")
                .addUserOption(opt =>
                    opt.setName("usuario")
                        .setDescription("Usuário a ser multado.")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("consultar")
                .setDescription("Consulta multas de um usuário.")
                .addUserOption(opt =>
                    opt.setName("usuario")
                        .setDescription("Usuário para consulta.")
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName("pagar")
                .setDescription("Paga uma multa específica.")
                .addStringOption(opt =>
                    opt.setName("id")
                        .setDescription("ID da multa.")
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const target = interaction.options.getUser("usuario") || interaction.user;
        const detranData = await getDetranData(interaction.guild.id, target.id);

        if (sub === "aplicar") {
            // Modal para detalhes da multa
            const modal = new ModalBuilder()
                .setCustomId(`multa_aplicar_${target.id}`)
                .setTitle("Aplicar Multa");

            const motivoInput = new TextInputBuilder()
                .setCustomId("motivo")
                .setLabel("Motivo da multa")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const valorInput = new TextInputBuilder()
                .setCustomId("valor")
                .setLabel("Valor da multa (R$)")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(10);

            const motivoRow = new ActionRowBuilder().addComponents(motivoInput);
            const valorRow = new ActionRowBuilder().addComponents(valorInput);
            modal.addComponents(motivoRow, valorRow);

            await interaction.showModal(modal);
        }

        if (sub === "consultar") {
            if (!detranData?.multas?.length) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle("Nenhuma Multa Encontrada")
                        .setColor(COLORS.info)
                        .setDescription(`${target} não possui multas pendentes.`)
                    ],
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`Multas de ${target.tag}`)
                .setColor(COLORS.warn)
                .setTimestamp();

            detranData.multas.forEach(m => {
                embed.addFields({
                    name: `ID: ${m.id}`,
                    value: `Motivo: ${m.motivo}\nValor: R$${m.valor}\nStatus: ${m.paga ? "Paga" : "Pendente"}`
                });
            });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === "pagar") {
            const id = interaction.options.getString("id");
            const multa = detranData.multas?.find(m => m.id === id);
            if (!multa) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle("Multa Não Encontrada")
                        .setColor(COLORS.error)
                        .setDescription(`ID ${id} não corresponde a nenhuma multa.`)
                    ],
                    ephemeral: true
                });
            }
            if (multa.paga) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle("Multa Já Paga")
                        .setColor(COLORS.warn)
                        .setDescription(`A multa ${id} já foi paga.`)
                    ],
                    ephemeral: true
                });
            }
            multa.paga = true;
            await saveDetranData(interaction.guild.id, target.id, detranData);
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle("Multa Paga")
                    .setColor(COLORS.success)
                    .setDescription(`A multa ${id} foi paga com sucesso.`)
                ],
                ephemeral: true
            });
        }
    }
};

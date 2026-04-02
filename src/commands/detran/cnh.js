const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const crypto = require("crypto");
const { getDetranData, saveDetranData } = require("../../data/detran/detranManager");
const { createSelectMenu } = require("../../utils/helpers");
const { getUser, writeDB } = require("../../utils/detranDB");

const COLORS = {
    success: "#2ecc71",
    error: "#e74c3c",
    warn: "#f1c40f",
    info: "#3498db"
};

function generateCNH() {
    return crypto.randomInt(10000000000, 99999999999).toString();
}

function noPerm() {
    return new EmbedBuilder()
        .setColor(COLORS.error)
        .setDescription("❌ Você não tem permissão para usar este comando.");
}

function createErrorEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.error)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

function createSuccessEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

function createWarnEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.warn)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

function createInfoEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cnh")
        .setDescription("[DETRAN] Sistema de CNH")
        // .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // REMOVIDO - Agora todos podem usar
        .addSubcommand(sub =>
            sub.setName("emitir")
                .setDescription("Emite uma CNH")
                .addUserOption(o => o.setName("usuario").setDescription("Usuário para emitir a CNH").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("consultar")
                .setDescription("Consulta a CNH")
                .addUserOption(o => o.setName("usuario").setDescription("Usuário para consultar a CNH"))
        )
        .addSubcommand(sub =>
            sub.setName("revogar")
                .setDescription("Revoga a CNH")
                .addUserOption(o => o.setName("usuario").setDescription("Usuário para revogar a CNH").setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const target = interaction.options.getUser("usuario") || interaction.user;
        const admin = interaction.user;

        const { db, user } = getUser(interaction.guild.id, target.id);

        // 🔹 EMITIR
        if (sub === "emitir") {
            // REMOVIDO: Verificação de administrador - agora todos podem emitir CNH
            // if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
            //     return interaction.reply({ embeds: [noPerm()], ephemeral: true });

            if (user.cnh.issued)
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(COLORS.warn).setDescription("⚠️ Este usuário já possui CNH.")],
                    ephemeral: true
                });

            // Menu de seleção de categoria
            const categoryOptions = [
                { label: 'A - Motocicletas', value: 'A', description: 'Veículos de duas rodas' },
                { label: 'B - Carros de Passeio', value: 'B', description: 'Veículos leves até 3.500kg' },
                { label: 'C - Caminhões', value: 'C', description: 'Veículos pesados de carga' },
                { label: 'D - Ônibus', value: 'D', description: 'Veículos de transporte coletivo' },
                { label: 'E - Carreta', value: 'E', description: 'Veículos articulados' },
                { label: 'AB - Motocicletas + Carros', value: 'AB', description: 'Categoria A + B' },
                { label: 'AC - Motocicletas + Caminhões', value: 'AC', description: 'Categoria A + C' },
                { label: 'AD - Motocicletas + Ônibus', value: 'AD', description: 'Categoria A + D' }
            ];

            const selectRow = createSelectMenu(`cnh_category_select_${target.id}_${admin.id}`, categoryOptions, 'Selecione a categoria da CNH');

            const embed = new EmbedBuilder()
                .setTitle("🪪 Emissão de CNH")
                .setColor(COLORS.info)
                .setDescription(`**Selecione a categoria da CNH para ${target.tag}:**\n\nEscolha a categoria apropriada no menu abaixo.`)
                .setFooter({ text: "DETRAN - Sistema Nacional de Trânsito" });

            return interaction.reply({
                embeds: [embed],
                components: [selectRow],
                ephemeral: true
            });
        }



        // 🔹 CONSULTAR
        if (sub === "consultar") {
            if (!user.cnh.issued)
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(COLORS.warn).setDescription("⚠️ Este usuário não possui CNH.")],
                    ephemeral: true
                });

            const expirationDate = new Date(user.cnh.issuedAt + 5 * 365 * 24 * 60 * 60 * 1000); // 5 years

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🪪 Carteira Nacional de Habilitação")
                        .setColor("#003366") // Dark blue for official
                        .setThumbnail("https://i.imgur.com/XXXXXXX.png") // Placeholder for CNH image
                        .setDescription("**Consulta de CNH**\n\nDados da Carteira Nacional de Habilitação.")
                        .addFields(
                            { name: "👤 Condutor", value: target.tag, inline: true },
                            { name: "🔢 Número da CNH", value: `\`${user.cnh.number}\``, inline: true },
                            { name: "📋 Categoria", value: user.cnh.category, inline: true },
                            { name: "📅 Data de Emissão", value: `<t:${Math.floor(user.cnh.issuedAt / 1000)}:D>`, inline: true },
                            { name: "⏰ Validade", value: `<t:${Math.floor(expirationDate.getTime() / 1000)}:D>`, inline: true },
                            { name: "⚖️ Pontos", value: `${user.cnh.points}/20`, inline: true }
                        )
                        .setFooter({ text: "DETRAN - Sistema Nacional de Trânsito", iconURL: interaction.guild.iconURL() })
                        .setTimestamp()
                ]
            });
        }

        // 🔹 REVOGAR
        if (sub === "revogar") {
            // REMOVIDO: Verificação de administrador - agora todos podem revogar CNH própria
            // if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
            //     return interaction.reply({ embeds: [noPerm()], ephemeral: true });

            user.cnh = {
                issued: false,
                number: null,
                category: null,
                points: 0,
                issuer: null,
                issuedAt: null
            };

            writeDB(db);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🗑️ CNH Revogada")
                        .setColor(COLORS.error)
                        .setDescription(`CNH de **${target.tag}** foi revogada.`)
                        .setFooter({ text: `Por ${admin.tag}` })
                        .setTimestamp()
                ]
            });
        }
    }
};

const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionsBitField
} = require("discord.js");
const { getUserData, updateUserData } = require("../../utils/jsonDB");

/* ===================== CONFIGURAÇÕES ===================== */

const COLORS = {
    SUCCESS: 0x2ecc71,
    ERROR: 0xe74c3c,
    WARNING: 0xf1c40f,
    INFO: 0x3498db
};

/**
 * Órgão emissor REALISTA (não DETRAN)
 */
const ISSUING_AUTHORITY = {
    name: "Secretaria de Segurança Pública",
    department: "Instituto de Identificação",
    short: "SSP / Instituto de Identificação"
};

const FOOTER_TEXT = "República Federativa do Brasil";



/* ===================== UTILIDADES ===================== */

function generateRG() {
    return `${Math.floor(10000000 + Math.random() * 90000000)}`;
}

function createEmbed(interaction, {
    title,
    description,
    color,
    fields = [],
    thumbnail
}) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .addFields(fields)
        .setThumbnail(thumbnail)
        .setFooter({
            text: FOOTER_TEXT,
            iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();
}

function noPermissionEmbed(interaction) {
    return createEmbed(interaction, {
        title: "🚫 Acesso Negado",
        description: "Você não possui autorização para esta operação.",
        color: COLORS.ERROR
    });
}

/* ===================== COMANDO ===================== */

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rg")
        .setDescription("🪪 Sistema Oficial de Registro Geral")
        // .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // REMOVIDO - Agora todos podem usar

        .addSubcommand(cmd =>
            cmd.setName("emitir")
                .setDescription("Emite um RG para um cidadão")
                .addUserOption(opt =>
                    opt.setName("usuario")
                        .setDescription("Cidadão")
                        .setRequired(true)
                )
        )

        .addSubcommand(cmd =>
            cmd.setName("consultar")
                .setDescription("Consulta um RG")
                .addUserOption(opt =>
                    opt.setName("usuario")
                        .setDescription("Cidadão")
                )
        )

        .addSubcommand(cmd =>
            cmd.setName("revogar")
                .setDescription("Cancela um RG")
                .addUserOption(opt =>
                    opt.setName("usuario")
                        .setDescription("Cidadão")
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const user = interaction.options.getUser("usuario") || interaction.user;
        const data = getUserData(interaction.guild.id, user.id);

        /* ===================== EMITIR ===================== */
        if (sub === "emitir") {
            // REMOVIDO: Verificação de administrador - agora todos podem emitir RG
            // if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
            //     return interaction.reply({ embeds: [noPermissionEmbed(interaction)], ephemeral: true });

            if (data.rg.issued)
                return interaction.reply({
                    embeds: [createEmbed(interaction, {
                        title: "⚠️ Documento Existente",
                        description: `${user} já possui RG emitido.`,
                        color: COLORS.WARNING
                    })],
                    ephemeral: true
                });

            data.rg = {
                issued: true,
                number: generateRG(),
                issuer: `${ISSUING_AUTHORITY.name} - ${ISSUING_AUTHORITY.department}`,
                timestamp: Date.now()
            };

            updateUserData(interaction.guild.id, user.id, data);

            return interaction.reply({
                embeds: [createEmbed(interaction, {
                    title: "🪪 REGISTRO GERAL",
                    description: "Documento Oficial de Identidade",
                    color: COLORS.SUCCESS,
                    thumbnail: user.displayAvatarURL({ dynamic: true }),
                    fields: [
                        { name: "👤 Titular", value: user.tag, inline: true },
                        { name: "📄 Número do RG", value: `\`${data.rg.number}\``, inline: true },
                        { name: "🏛️ Órgão Emissor", value: ISSUING_AUTHORITY.short, inline: true },
                        {
                            name: "📅 Data de Emissão",
                            value: `<t:${Math.floor(data.rg.timestamp / 1000)}:d>`
                        }
                    ]
                })]
            });
        }

        /* ===================== CONSULTAR ===================== */
        if (sub === "consultar") {
            if (!data.rg.issued)
                return interaction.reply({
                    embeds: [createEmbed(interaction, {
                        title: "ℹ️ Nenhum Registro Encontrado",
                        description: `${user} não possui RG.`,
                        color: COLORS.WARNING
                    })],
                    ephemeral: true
                });

            return interaction.reply({
                embeds: [createEmbed(interaction, {
                    title: "🪪 REGISTRO GERAL",
                    description: "Consulta Oficial de Documento",
                    color: COLORS.INFO,
                    thumbnail: user.displayAvatarURL({ dynamic: true }),
                    fields: [
                        { name: "👤 Titular", value: user.tag, inline: true },
                        { name: "📄 Número", value: `\`${data.rg.number}\``, inline: true },
                        { name: "🏛️ Órgão Emissor", value: data.rg.issuer, inline: true },
                        {
                            name: "📅 Emissão",
                            value: `<t:${Math.floor(data.rg.timestamp / 1000)}:d>`
                        }
                    ]
                })]
            });
        }

        /* ===================== REVOGAR ===================== */
        if (sub === "revogar") {
            // REMOVIDO: Verificação de administrador - agora todos podem revogar RG próprio
            // if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
            //     return interaction.reply({ embeds: [noPermissionEmbed(interaction)], ephemeral: true });

            if (!data.rg.issued)
                return interaction.reply({
                    embeds: [createEmbed(interaction, {
                        title: "⚠️ Documento Inexistente",
                        description: `${user} não possui RG ativo.`,
                        color: COLORS.WARNING
                    })],
                    ephemeral: true
                });

            data.rg = {
                issued: false,
                number: null,
                issuer: null,
                timestamp: null
            };

            updateUserData(interaction.guild.id, user.id, data);

            return interaction.reply({
                embeds: [createEmbed(interaction, {
                    title: "🗑️ RG Cancelado",
                    description: `O RG de ${user} foi cancelado.`,
                    color: COLORS.ERROR,
                    fields: [
                        {
                            name: "📅 Data do Cancelamento",
                            value: `<t:${Math.floor(Date.now() / 1000)}:d>`
                        }
                    ]
                })]
            });
        }
    }
};

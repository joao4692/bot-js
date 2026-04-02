const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, TextInputStyle } = require("discord.js");
const { getDetranData, saveDetranData, getAllDetranData } = require("../../data/detran/detranManager");
const { createModal } = require("../../utils/helpers");

// ───── GERAR PLACA ─────
function generatePlate() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";

    return (
        letters[Math.floor(Math.random() * 26)] +
        letters[Math.floor(Math.random() * 26)] +
        letters[Math.floor(Math.random() * 26)] +
        " " +
        numbers[Math.floor(Math.random() * 10)] +
        numbers[Math.floor(Math.random() * 10)] +
        numbers[Math.floor(Math.random() * 10)] +
        numbers[Math.floor(Math.random() * 10)]
    );
}

// ───── EMBED PADRÃO ─────
function createEmbed({ title, description, color, fields = [], footer, thumbnail }) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .addFields(fields)
        .setFooter(footer)
        .setThumbnail(thumbnail)
        .setTimestamp();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("veiculo")
        .setDescription("[DETRAN] Comandos relacionados a veículos.")
        // .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // REMOVIDO - Agora todos podem usar

        .addSubcommand(sub =>
            sub.setName("registrar")
                .setDescription("[ADMIN] Registra um novo veículo.")
                .addUserOption(opt =>
                    opt.setName("proprietario")
                        .setDescription("Dono do veículo")
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub.setName("consultar")
                .setDescription("Consulta veículos de um usuário.")
                .addUserOption(opt =>
                    opt.setName("usuario")
                        .setDescription("Usuário para consulta")
                        .setRequired(false)
                )
        )

        .addSubcommand(sub =>
            sub.setName("transferir")
                .setDescription("Transfere um veículo.")
                .addStringOption(opt =>
                    opt.setName("placa")
                        .setDescription("Placa do veículo")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addUserOption(opt =>
                    opt.setName("novo_proprietario")
                        .setDescription("Novo dono")
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub.setName("apreender")
                .setDescription("[ADMIN] Apreende um veículo.")
                .addStringOption(opt =>
                    opt.setName("placa")
                        .setDescription("Placa do veículo")
                        .setRequired(true)
                )
        ),

    // ───── AUTOCOMPLETE ─────
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        if (focused.name !== "placa") return;

        const detranData = await getDetranData(interaction.guild.id, interaction.user.id);
        if (!detranData?.vehicles?.length) {
            return interaction.respond([]);
        }

        const choices = detranData.vehicles.map(v => ({
            name: `${v.plate} - ${v.model}`,
            value: v.plate
        }));

        const filtered = choices.filter(c =>
            c.name.toLowerCase().includes(focused.value.toLowerCase())
        );

        await interaction.respond(filtered.slice(0, 25));
    },

    // ───── EXECUTE ─────
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const adminUser = interaction.user;

        // ───── REGISTRAR ─────
        if (subcommand === "registrar") {
            const owner = interaction.options.getUser("proprietario");

            // Modal para inserir dados do veículo
            const modal = createModal(`veiculo_registrar_${owner.id}`, "🚗 Registrar Novo Veículo", [
                {
                    customId: "modelo",
                    label: "Modelo do Veículo",
                    placeholder: "Ex: Honda Civic, Toyota Corolla",
                    required: true,
                    maxLength: 50
                },
                {
                    customId: "cor",
                    label: "Cor do Veículo",
                    placeholder: "Ex: Preto, Branco, Vermelho",
                    required: false,
                    maxLength: 30
                },
                {
                    customId: "ano",
                    label: "Ano de Fabricação",
                    placeholder: "Ex: 2020",
                    required: false,
                    maxLength: 4
                }
            ]);

            await interaction.showModal(modal);
        }

        // ───── CONSULTAR ─────
        if (subcommand === "consultar") {
            const user = interaction.options.getUser("usuario") || interaction.user;
            const detranData = await getDetranData(interaction.guild.id, user.id);

            if (!detranData?.vehicles?.length) {
                return interaction.reply({
                    embeds: [createEmbed({
                        title: "⚠️ Nenhum Veículo",
                        description: `${user.username} não possui veículos registrados.`,
                        color: "#f1c40f",
                        thumbnail: user.displayAvatarURL({ dynamic: true })
                    })],
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`🚘 Veículos de ${user.username}`)
                .setColor("#3498db")
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            detranData.vehicles.forEach(v => {
                embed.addFields({
                    name: `${v.model} • \`${v.plate}\``,
                    value: `📍 Status: **${v.inGarage ? "Na Garagem" : "Em Uso"}**\n🕒 Registro: <t:${Math.floor(new Date(v.timestamp).getTime() / 1000)}:d>`
                });
            });

            return interaction.reply({ embeds: [embed] });
        }

        // ───── TRANSFERIR ─────
        if (subcommand === "transferir") {
            const plate = interaction.options.getString("placa");
            const newOwner = interaction.options.getUser("novo_proprietario");

            const oldOwnerData = await getDetranData(interaction.guild.id, adminUser.id);
            const index = oldOwnerData?.vehicles?.findIndex(v => v.plate === plate);

            if (index === -1 || index === undefined) {
                return interaction.reply({
                    embeds: [createEmbed({
                        title: "❌ Veículo Não Encontrado",
                        description: "Você não possui um veículo com essa placa.",
                        color: "#e74c3c"
                    })],
                    ephemeral: true
                });
            }

            const [vehicle] = oldOwnerData.vehicles.splice(index, 1);
            vehicle.ownerId = newOwner.id;

            const newOwnerData = await getDetranData(interaction.guild.id, newOwner.id);
            if (!newOwnerData.vehicles) newOwnerData.vehicles = [];
            newOwnerData.vehicles.push(vehicle);

            await saveDetranData(interaction.guild.id, adminUser.id, oldOwnerData);
            await saveDetranData(interaction.guild.id, newOwner.id, newOwnerData);

            return interaction.reply({
                embeds: [createEmbed({
                    title: "🤝 Transferência Concluída",
                    description: "Veículo transferido com sucesso.",
                    color: "#9b59b6",
                    fields: [
                        { name: "🚘 Placa", value: `\`${vehicle.plate}\`` },
                        { name: "👤 Novo Dono", value: newOwner.tag }
                    ]
                })]
            });
        }

        // ───── APREENDER ─────
        if (subcommand === "apreender") {
            const plate = interaction.options.getString("placa");
            const allData = await getAllDetranData(interaction.guild.id);

            for (const userId in allData) {
                const userData = allData[userId];
                const vehicle = userData?.vehicles?.find(v => v.plate === plate);

                if (vehicle) {
                    vehicle.inGarage = true;
                    await saveDetranData(interaction.guild.id, userId, userData);

                    return interaction.reply({
                        embeds: [createEmbed({
                            title: "🚨 Veículo Apreendido",
                            description: "O veículo foi apreendido e enviado para a garagem.",
                            color: "#c0392b",
                            fields: [{ name: "📄 Placa", value: `\`${vehicle.plate}\`` }],
                            footer: { text: `Apreendido por ${adminUser.tag}` }
                        })]
                    });
                }
            }

            return interaction.reply({
                embeds: [createEmbed({
                    title: "❌ Não Encontrado",
                    description: "Nenhum veículo com essa placa foi encontrado.",
                    color: "#e74c3c"
                })],
                ephemeral: true
            });
        }
    }
};

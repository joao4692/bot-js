const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("fs");
const path = require("path");

/* ===================== CONFIGURAÇÃO ===================== */

const BASE_PATH = path.join(__dirname, "../../json/rp/barcos");
const cache = new Map();
const COLORS = {
    SUCCESS: 0x2ecc71,
    WARNING: 0xf1c40f,
    INFO: 0x3498db,
    ERROR: 0xe74c3c,
    DANGER: 0xc0392b
};

/* ===================== HELPERS ===================== */

function ensureDir() {
    if (!fs.existsSync(BASE_PATH)) fs.mkdirSync(BASE_PATH, { recursive: true });
}

function getFilePath(guildId) {
    return path.join(BASE_PATH, `${guildId}.json`);
}

// Carrega JSON da guild com cache
function loadGuildDB(guildId) {
    if (cache.has(guildId)) return cache.get(guildId);

    ensureDir();
    const filePath = getFilePath(guildId);

    if (!fs.existsSync(filePath)) {
        cache.set(guildId, []);
        return [];
    }

    try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        cache.set(guildId, data);
        return data;
    } catch (err) {
        console.error(`Erro ao ler JSON da guild ${guildId}`, err);
        cache.set(guildId, []);
        return [];
    }
}

// Salva JSON da guild de forma assíncrona
function saveGuildDB(guildId) {
    if (!cache.has(guildId)) return;
    const filePath = getFilePath(guildId);
    fs.writeFile(filePath, JSON.stringify(cache.get(guildId), null, 2), err => {
        if (err) console.error(`Erro ao salvar JSON da guild ${guildId}`, err);
    });
}

// Gera placa de barco no formato AAA 0000
function generateBoatPlate() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomLetter = () => letters[Math.floor(Math.random() * letters.length)];
    const randomNumber = () => Math.floor(Math.random() * 10);

    return `${randomLetter()}${randomLetter()}${randomLetter()} ${randomNumber()}${randomNumber()}${randomNumber()}${randomNumber()}`;
}

/* ===================== COMANDO ===================== */

module.exports = {
    data: new SlashCommandBuilder()
        .setName("barco")
        .setDescription("[RP] Comandos relacionados a barcos")
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)

        .addSubcommand(sub =>
            sub.setName("registrar")
                .setDescription("[ADMIN] Registra um novo barco")
                .addUserOption(opt => opt.setName("proprietario").setDescription("Dono do barco").setRequired(true))
                .addStringOption(opt => opt.setName("modelo").setDescription("Modelo do barco").setRequired(true))
        )

        .addSubcommand(sub =>
            sub.setName("consultar")
                .setDescription("Consulta barcos de um usuário")
                .addUserOption(opt => opt.setName("usuario").setDescription("Usuário para consulta"))
        )

        .addSubcommand(sub =>
            sub.setName("revogar")
                .setDescription("[ADMIN] Revoga um barco")
                .addStringOption(opt => opt.setName("placa").setDescription("Placa do barco").setRequired(true))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const barcos = loadGuildDB(guildId);

        /* ───── REGISTRAR ───── */
        if (subcommand === "registrar") {
            const owner = interaction.options.getUser("proprietario");
            const model = interaction.options.getString("modelo");

            const boat = {
                plate: generateBoatPlate(),
                model,
                ownerId: owner.id,
                timestamp: new Date().toISOString()
            };

            barcos.push(boat);
            cache.set(guildId, barcos);
            saveGuildDB(guildId);

            // Badge/histórico
            // Log admin
            const logChannel = interaction.guildConfig?.logs?.boats;
            if (logChannel) {
                const channel = interaction.guild.channels.cache.get(logChannel);
                if (channel) {
                    channel.send({ content: `🚤 ${owner.tag} registrou barco: ${model} (${boat.plate})` });
                }
            }

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle("🚤 Barco Registrado")
                    .setDescription(`O barco **${model}** foi registrado com sucesso!`)
                    .setColor(COLORS.SUCCESS)
                    .addFields(
                        { name: "📄 Placa", value: `\`${boat.plate}\``, inline: true },
                        { name: "👤 Proprietário", value: owner.tag, inline: true }
                    )
                    .setFooter({ text: "Sistema Marítimo RP", iconURL: interaction.client.user.displayAvatarURL() })
                    .setThumbnail(owner.displayAvatarURL({ dynamic: true }))
                    .setTimestamp()
                ]
            });
        }

        /* ───── CONSULTAR ───── */
        if (subcommand === "consultar") {
            const user = interaction.options.getUser("usuario") || interaction.user;
            const userBarcos = barcos.filter(b => b.ownerId === user.id);

            if (!userBarcos.length) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle("⚠️ Nenhum Barco")
                        .setDescription(`${user.username} não possui barcos registrados.`)
                        .setColor(COLORS.WARNING)
                        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    ],
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`🚤 Barcos de ${user.username}`)
                .setColor(COLORS.INFO)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            userBarcos.forEach(b => {
                embed.addFields({
                    name: `${b.model} • \`${b.plate}\``,
                    value: `🕒 Registro: <t:${Math.floor(new Date(b.timestamp).getTime() / 1000)}:d>`
                });
            });

            return interaction.reply({ embeds: [embed] });
        }

        /* ───── REVOGAR ───── */
        if (subcommand === "revogar") {
            const plate = interaction.options.getString("placa");
            const index = barcos.findIndex(b => b.plate === plate);

            if (index === -1) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle("❌ Barco Não Encontrado")
                        .setDescription("Nenhum barco com essa placa foi encontrado.")
                        .setColor(COLORS.ERROR)
                    ],
                    ephemeral: true
                });
            }

            const boat = barcos.splice(index, 1)[0];
            cache.set(guildId, barcos);
            saveGuildDB(guildId);

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle("🗑️ Barco Revogado")
                    .setDescription("O barco foi revogado com sucesso.")
                    .setColor(COLORS.DANGER)
                    .addFields({ name: "📄 Placa", value: `\`${boat.plate}\`` })
                    .setFooter({ text: `Revogado por ${interaction.user.tag}` })
                    .setTimestamp()
                ]
            });
        }
    }
};

const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Caminhos dos arquivos JSON
const permissoesFilePath = path.join(__dirname, "../../json/rp/permissoes_maritimas.json");

// Função para garantir que a pasta exista
function ensureFolderExists(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Função para ler os dados das permissões
function readPermissoes() {
    ensureFolderExists(permissoesFilePath);
    if (!fs.existsSync(permissoesFilePath)) return [];
    return JSON.parse(fs.readFileSync(permissoesFilePath, "utf8"));
}

// Função para salvar os dados das permissões
function writePermissoes(data) {
    ensureFolderExists(permissoesFilePath);
    fs.writeFileSync(permissoesFilePath, JSON.stringify(data, null, 2));
}

// Função para gerar número de permissão marítima
function generatePermissaoNumber() {
    return Math.random().toString().slice(2, 13);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("permissao_maritima")
        .setDescription("[RP] Comandos relacionados a permissões marítimas.")
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)

        .addSubcommand(sub =>
            sub.setName("registrar")
                .setDescription("[ADMIN] Registra uma nova permissão marítima.")
                .addUserOption(opt =>
                    opt.setName("usuario")
                        .setDescription("Usuário para registrar")
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName("tipo")
                        .setDescription("Tipo da permissão (Piloto, Capitão, etc)")
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub.setName("consultar")
                .setDescription("Consulta permissões marítimas de um usuário.")
                .addUserOption(opt =>
                    opt.setName("usuario")
                        .setDescription("Usuário para consulta")
                        .setRequired(false)
                )
        )

        .addSubcommand(sub =>
            sub.setName("revogar")
                .setDescription("[ADMIN] Revoga uma permissão marítima.")
                .addUserOption(opt =>
                    opt.setName("usuario")
                        .setDescription("Usuário cuja permissão será revogada")
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // ───── REGISTRAR ─────
        if (subcommand === "registrar") {
            const user = interaction.options.getUser("usuario");
            const tipo = interaction.options.getString("tipo");

            const permissoes = readPermissoes();
            const existing = permissoes.find(p => p.userId === user.id);

            if (existing) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle("⚠️ Permissão Já Existe")
                        .setDescription(`${user.username} já possui uma permissão marítima.`)
                        .setColor("#f1c40f")
                    ],
                    ephemeral: true
                });
            }

            const permissao = {
                userId: user.id,
                number: generatePermissaoNumber(),
                tipo,
                issuer: interaction.user.id,
                timestamp: new Date().toISOString()
            };

            permissoes.push(permissao);
            writePermissoes(permissoes);

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle("✅ Permissão Marítima Registrada")
                    .setDescription(`A permissão marítima para **${user.tag}** foi registrada.`)
                    .setColor("#2ecc71")
                    .addFields(
                        { name: "🔢 Número", value: `\`${permissao.number}\``, inline: true },
                        { name: "🏷️ Tipo", value: permissao.tipo, inline: true }
                    )
                    .setFooter({ text: `Registrada por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp()
                ]
            });
        }

        // ───── CONSULTAR ─────
        if (subcommand === "consultar") {
            const user = interaction.options.getUser("usuario") || interaction.user;
            const permissoes = readPermissoes();
            const permissao = permissoes.find(p => p.userId === user.id);

            if (!permissao) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle("⚠️ Nenhuma Permissão")
                        .setDescription(`${user.username} não possui permissão marítima.`)
                        .setColor("#f1c40f")
                        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    ],
                    ephemeral: true
                });
            }

            const issuer = await interaction.client.users.fetch(permissao.issuer).catch(() => ({ tag: 'Desconhecido' }));
            const issueDate = new Date(permissao.timestamp);

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle(`🏴‍☠️ Permissão Marítima de ${user.username}`)
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setColor("#3498db")
                    .addFields(
                        { name: "🔢 Número", value: `\`${permissao.number}\``, inline: true },
                        { name: "🏷️ Tipo", value: permissao.tipo, inline: true },
                        { name: "📅 Data de Emissão", value: `<t:${Math.floor(issueDate.getTime() / 1000)}:d>`, inline: false },
                        { name: "👤 Emitida por", value: issuer.tag, inline: false }
                    )
                    .setTimestamp()
                ]
            });
        }

        // ───── REVOGAR ─────
        if (subcommand === "revogar") {
            const user = interaction.options.getUser("usuario");
            const permissoes = readPermissoes();
            const index = permissoes.findIndex(p => p.userId === user.id);

            if (index === -1) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle("❌ Permissão Não Encontrada")
                        .setDescription(`${user.username} não possui permissão marítima para revogar.`)
                        .setColor("#e74c3c")
                    ],
                    ephemeral: true
                });
            }

            const permissao = permissoes.splice(index, 1)[0];
            writePermissoes(permissoes);

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle("🗑️ Permissão Revogada")
                    .setDescription(`A permissão marítima de **${user.tag}** foi revogada.`)
                    .setColor("#c0392b")
                    .addFields({ name: "🔢 Número", value: `\`${permissao.number}\`` })
                    .setFooter({ text: `Revogada por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp()
                ]
            });
        }
    }
};

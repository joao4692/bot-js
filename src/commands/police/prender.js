const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ButtonStyle } = require("discord.js");
const { getPoliceData, savePoliceData } = require("../../data/police/policeManager");
const { createConfirmButtons } = require("../../utils/helpers");
const ms = require("ms");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("prender")
    .setDescription("[POLÍCIA] Prende um usuário por um tempo determinado.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // TODO: Change to a specific police role
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("O usuário a ser preso.")
        .setRequired(true)
    ),
  async execute(interaction, client, guildConfig) {
    const targetUser = interaction.options.getUser("usuario");
    const officer = interaction.user;

    if (targetUser.bot || targetUser.id === officer.id) {
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor("#ff0000")
                .setTitle('❌ Usuário Inválido')
                .setDescription('Você não pode prender este usuário.')
            ],
            ephemeral: true
        });
    }

    // Verificar se já está preso
    const policeData = await getPoliceData(targetUser.id, interaction.guild.id);
    if (policeData.isJailed) {
        const releaseTime = policeData.jailTime;
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor("#f1c40f")
                .setTitle('⚠️ Usuário Já Está Preso')
                .setDescription(`${targetUser.tag} já está preso.\n\n🔓 **Soltura em:** <t:${Math.floor(releaseTime / 1000)}:R>`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            ],
            ephemeral: true
        });
    }

    // Mostrar informações iniciais e botão para prosseguir
    const infoEmbed = new EmbedBuilder()
        .setTitle('⛓️ Sistema de Prisão')
        .setColor('#c0392b')
        .setDescription(`**Iniciando processo de prisão para ${targetUser.tag}**\n\nClique em "Continuar" para inserir os detalhes da prisão.`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Sistema Policial - Prisão', iconURL: interaction.client.user.displayAvatarURL() });

    const row = createConfirmButtons(`policia_prender_${targetUser.id}`, {
      confirmLabel: 'Continuar com Prisão',
      confirmStyle: ButtonStyle.Danger,
      confirmEmoji: '⛓️',
      cancelLabel: 'Cancelar'
    });

    await interaction.reply({ embeds: [infoEmbed], components: [row], ephemeral: true });
  }
};

const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ButtonStyle } = require("discord.js");
const { createConfirmButtons } = require("../../utils/helpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("multar")
    .setDescription("[POLÍCIA] Aplica uma multa a um usuário.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // TODO: Change to a specific police role
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("O usuário a ser multado.")
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
                .setDescription('Você não pode multar este usuário.')
            ],
            ephemeral: true
        });
    }

    // Mostrar informações iniciais e botão para prosseguir
    const infoEmbed = new EmbedBuilder()
        .setTitle('🚔 Sistema de Multas')
        .setColor('#e67e22')
        .setDescription(`**Iniciando processo de multa para ${targetUser.tag}**\n\nClique em "Continuar" para inserir os detalhes da multa.`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Sistema Policial - Aplicação de Multas', iconURL: interaction.client.user.displayAvatarURL() });

    const row = createConfirmButtons(`policia_multar_${targetUser.id}`, {
      confirmLabel: 'Continuar com Multa',
      confirmStyle: ButtonStyle.Danger,
      confirmEmoji: '🚔',
      cancelLabel: 'Cancelar'
    });

    await interaction.reply({ embeds: [infoEmbed], components: [row], ephemeral: true });
  }
};

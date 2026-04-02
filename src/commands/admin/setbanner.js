const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setbanner')
    .setDescription('[ADMIN] Define o banner do servidor com uma imagem.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addAttachmentOption(option =>
      option.setName('imagem')
        .setDescription('A imagem para definir como banner do servidor.')
        .setRequired(true)
    ),

  async execute(interaction) {
    const attachment = interaction.options.getAttachment('imagem');

    // Check if attachment is an image
    if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ O arquivo enviado não é uma imagem válida.')
        ],
        ephemeral: true
      });
    }

    try {
      // Set the guild banner
      await interaction.guild.setBanner(attachment.url);

      const embed = new EmbedBuilder()
        .setTitle('✅ Banner Atualizado')
        .setDescription('O banner do servidor foi definido com sucesso!')
        .setColor('#00ff00')
        .setImage(attachment.url)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erro ao definir banner:', error);
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff0000')
          .setDescription('❌ Ocorreu um erro ao definir o banner. Verifique se o bot tem permissões suficientes e se a imagem é válida.')
        ],
        ephemeral: true
      });
    }
  }
};

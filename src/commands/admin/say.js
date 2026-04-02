const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Faz o bot enviar uma mensagem, imagem ou embed")
    .addStringOption(option =>
      option
        .setName("mensagem")
        .setDescription("Texto que o bot irá enviar")
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option
        .setName("arquivo")
        .setDescription("Imagem ou arquivo para enviar")
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName("embed")
        .setDescription("Enviar a mensagem em embed?")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // opcional

  async execute(interaction) {
    const mensagem = interaction.options.getString("mensagem");
    const arquivo = interaction.options.getAttachment("arquivo");
    const usarEmbed = interaction.options.getBoolean("embed");

    // Se não enviar nada
    if (!mensagem && !arquivo) {
      return interaction.reply({
        content: "❌ Você precisa enviar uma mensagem ou um arquivo.",
        ephemeral: true
      });
    }

    await interaction.reply({
      content: "✅ Mensagem enviada!",
      ephemeral: true
    });

    // 🔹 EMBED
    if (usarEmbed) {
      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setDescription(mensagem || null)
        .setTimestamp();

      if (arquivo?.contentType?.startsWith("image")) {
        embed.setImage(arquivo.url);
      }

      return interaction.channel.send({
        embeds: [embed]
      });
    }

    // 🔹 MENSAGEM NORMAL
    await interaction.channel.send({
      content: mensagem || null,
      files: arquivo ? [arquivo] : []
    });
  }
};

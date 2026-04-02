const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("links")
    .setDescription("Envia os links oficiais do servidor (WhatsApp e Discord).")
    .addChannelOption(option =>
      option
        .setName("canal")
        .setDescription("Canal onde os links serão enviados")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const canal = interaction.options.getChannel("canal");

    const embed = new EmbedBuilder()
      .setTitle("🎉 Bem-vindo(a) à BRASIL.LAND!")
      .setColor("#2ECC71")
      .setDescription(`
✨ **Escolha onde quer participar e venha fazer parte da nossa comunidade!**

━━━━━━━━━━━━━━━━━━━━━━━

💬 **WhatsApp (Grupo Oficial)**  
👉 [Clique aqui para entrar](https://chat.whatsapp.com/JANKgI0MWW5JdB6DwtiVhK?mode=gi_t)

🎮 **Discord (Servidor Oficial)**  
👉 [Clique aqui para entrar](https://discord.gg/RetcgmFyvJ)

━━━━━━━━━━━━━━━━━━━━━━━

🚀 **Por que entrar?**
• Fazer novas amizades  
• Participar de eventos  
• Ficar por dentro de novidades  
• Interagir com a comunidade  

⚠️ **Importante:**  
• Utilize apenas os links oficiais  
• Respeite as regras em todas as plataformas  

🌟 **Não fique de fora — junte-se agora!**
`)
      .setFooter({ text: `Servidor: ${interaction.guild.name}` })
      .setTimestamp();

    await canal.send({ embeds: [embed] });

    await interaction.reply({
      content: `✅ Links enviados com sucesso no canal ${canal}.`,
      flags: 64
    });
  }
};
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverinfos")
    .setDescription("Lista os servidores com link de convite."),

  async execute(interaction, client) {

    const ownerId = "SEU_ID_AQUI";
    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        content: "❌ Você não pode usar este comando.",
        ephemeral: true
      });
    }

    const guilds = client.guilds.cache;

    if (!guilds.size) {
      return interaction.reply({
        content: "⚠️ O bot não está em nenhum servidor.",
        ephemeral: true
      });
    }

    const results = [];

    for (const guild of guilds.values()) {
      try {
        // Pega o primeiro canal que permite convite
        const channel = guild.channels.cache
          .filter(c => c.isTextBased() && c.permissionsFor(guild.members.me).has("CreateInstantInvite"))
          .first();

        if (!channel) {
          results.push(`• **${guild.name}** (\`${guild.id}\`)\n❌ Sem permissão para criar convite`);
          continue;
        }

        const invite = await channel.createInvite({
          maxAge: 0,
          maxUses: 0
        });

        results.push(`• **${guild.name}** (\`${guild.id}\`)\n🔗 ${invite.url}`);

      } catch (err) {
        results.push(`• **${guild.name}**\n⚠️ Erro ao gerar convite`);
      }
    }

    // dividir por limite do Discord
    const chunks = [];
    let temp = "";

    for (const line of results) {
      if ((temp + line).length > 4000) {
        chunks.push(temp);
        temp = "";
      }
      temp += line + "\n\n";
    }
    if (temp) chunks.push(temp);

    const embed = new EmbedBuilder()
      .setTitle("🌍 Servidores do Bot com Convite")
      .setDescription(chunks[0])
      .setColor("#5865F2")
      .setFooter({ text: `Total: ${guilds.size} servidores` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    for (let i = 1; i < chunks.length; i++) {
      const extra = new EmbedBuilder()
        .setDescription(chunks[i])
        .setColor("#5865F2");

      await interaction.followUp({ embeds: [extra], ephemeral: true });
    }
  }
};
const { SlashCommandBuilder } = require("discord.js");

const loops = new Map(); // guarda quem está sendo marcado

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spamtag")
    .setDescription("📢 Fica marcando um usuário repetidamente")
    .addSubcommand(sub =>
      sub
        .setName("iniciar")
        .setDescription("Começar a marcar alguém")
        .addUserOption(option =>
          option.setName("usuario").setDescription("Quem será marcado").setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName("tempo").setDescription("Intervalo em segundos").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("parar")
        .setDescription("Parar de marcar o usuário")
        .addUserOption(option =>
          option.setName("usuario").setDescription("Quem parar de marcar").setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // INICIAR
    if (sub === "iniciar") {
      const user = interaction.options.getUser("usuario");
      const tempo = interaction.options.getInteger("tempo");

      if (loops.has(user.id)) {
        return interaction.reply({
          content: "⚠️ Esse usuário já está sendo marcado!",
          ephemeral: true
        });
      }

      const interval = setInterval(() => {
        interaction.channel.send(`${user}`);
      }, tempo * 1000);

      loops.set(user.id, interval);

      return interaction.reply({
        content: `✅ Comecei a marcar ${user} a cada ${tempo}s`,
        ephemeral: true
      });
    }

    // PARAR
    if (sub === "parar") {
      const user = interaction.options.getUser("usuario");

      if (!loops.has(user.id)) {
        return interaction.reply({
          content: "⚠️ Esse usuário não está sendo marcado.",
          ephemeral: true
        });
      }

      clearInterval(loops.get(user.id));
      loops.delete(user.id);

      return interaction.reply({
        content: `🛑 Parei de marcar ${user}`,
        ephemeral: true
      });
    }
  }
};
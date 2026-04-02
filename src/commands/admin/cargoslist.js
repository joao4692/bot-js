const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cargos")
    .setDescription("📜 Lista todos os cargos do servidor")
    .addBooleanOption(option =>
      option
        .setName("privado")
        .setDescription("Mostrar apenas para você (padrão: falso)")
    ),

  async execute(interaction) {
    try {
      const isPrivate = interaction.options.getBoolean("privado") || false;

      const roles = interaction.guild.roles.cache
        .sort((a, b) => b.position - a.position) // ordena do maior para o menor
        .filter(role => role.id !== interaction.guild.id); // remove @everyone

      if (!roles.size) {
        return await interaction.reply({
          content: "⚠️ Nenhum cargo encontrado neste servidor.",
          ephemeral: true
        });
      }

      // Montar lista de cargos
      const rolesList = roles.map(role => `• ${role}`).join("\n");

      // Se passar limite do Discord, divide em partes
      const chunks = [];
      for (let i = 0; i < rolesList.length; i += 4000) {
        chunks.push(rolesList.substring(i, i + 4000));
      }

      for (let i = 0; i < chunks.length; i++) {
        const embed = new EmbedBuilder()
          .setColor("#00bfff")
          .setTitle(`📜 Lista de Cargos (${roles.size})`)
          .setDescription(chunks[i])
          .setFooter({
            text: `${interaction.guild.name} • Sistema de Cargos`,
            iconURL: interaction.guild.iconURL({ dynamic: true })
          })
          .setTimestamp();

        if (i === 0) {
          await interaction.reply({
            embeds: [embed],
            ephemeral: isPrivate
          });
        } else {
          await interaction.followUp({
            embeds: [embed],
            ephemeral: isPrivate
          });
        }
      }

    } catch (error) {
      console.error("Erro no comando /cargos:", error);

      const errorMessage = "❌ Ocorreu um erro ao listar os cargos.";

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: errorMessage,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: errorMessage,
          ephemeral: true
        });
      }
    }
  }
};
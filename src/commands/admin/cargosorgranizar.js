const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cargosorg")
    .setDescription("🔧 Organiza automaticamente os cargos do servidor"),

  async execute(interaction) {
    try {
      await interaction.reply({
        content: "🔄 Organizando cargos...",
        ephemeral: true
      });

      const guild = interaction.guild;
      const roles = guild.roles.cache;

      const getRole = (name) =>
        roles.find(r => r.name.toLowerCase() === name.toLowerCase());

      // ORDEM FINAL (de cima pra baixo)
      const ordem = [
        // STAFF
        "👑 FUNDADOR",
        "🛡️ ADMINISTRADOR",
        "🔧 MODERADOR",
        "🎟️ SUPORTE",
        "🤖 BOT",

        // ESPECIAIS
        "💎 VIP",
        "Server Booster",

        // GOVERNO
        "🏛️ PREFEITO",
        "⚖️ JUIZ",
        "⚖️ ADVOGADO",
        "ADV 3",
        "ADV 2",
        "ADV 1",

        // POLÍCIA
        "🏅 Comandante-Geral",
        "🏅Coronel",
        "🏅 Tenente-Coronel",
        "🏅 Major",
        "🏅 Capitão",
        "🏅 Tenente",
        "🏅 Sargento",
        "🏅 Cabo",
        "🏅 Soldado",
        "🏅 Recruta",
        "🚔 POLÍCIA",
        "COE",

        // SERVIÇOS
        "🏥 MÉDICO",
        "💊FARMACEUTICO",
        "🧑‍🔧 MECÂNICO",
        "🚗 DETRAN",

        // PROFISSÕES
        "🏢 EMPRESÁRIO",
        "💎BANQUEIRO",
        "🛒 LOJISTA",
        "🚛 TRANSPORTADOR",
        "🏗️ CONSTRUTOR",
        "🌾 FAZENDEIRO",
        "🎣 CAÇADOR",
        "🪓 LENHADOR",
        "⛏️ MINERADOR",
        "🔫 ARMEIRO",
        "🚗CONCESSONARIA",

        // CRIME
        "🏴‍☠️ MILÍCIA",
        "MELICIANO",
        "💊 NARCO",

        // CIDADÃO
        "🧾 CIDADÃO",
        "Ficha suja",

        // OUTROS
        "BRICS"
      ];

      let position = ordem.length + 1;

      for (const nome of ordem) {
        const role = getRole(nome);
        if (!role) continue;

        try {
          await role.setPosition(position);
          position--;
        } catch (err) {
          console.log(`Erro ao mover cargo ${nome}:`, err.message);
        }
      }

      await interaction.followUp({
        content: "✅ Cargos organizados com sucesso!",
        ephemeral: true
      });

    } catch (error) {
      console.error("Erro ao organizar cargos:", error);

      await interaction.followUp({
        content: "❌ Erro ao organizar os cargos.",
        ephemeral: true
      });
    }
  }
};
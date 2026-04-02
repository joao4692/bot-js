const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("regras")
    .setDescription("Envia as regras oficiais do servidor BRASIL.LAND ROLEPLAY.")
    .addChannelOption(option =>
      option
        .setName("canal")
        .setDescription("Canal onde as regras serão enviadas")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client, guildConfig) {
    const canal = interaction.options.getChannel("canal");

    // Paleta de cores
    const colors = {
      rp: "#9B59B6",        // Roxo
      conduta: "#3498DB",   // Azul
      pvp: "#E74C3C",       // Vermelho
      faccoes: "#F1C40F",   // Amarelo
      uniformes: "#1ABC9C", // Verde água
      cacador: "#2ECC71",   // Verde
      veiculos: "#E67E22",  // Laranja
      reacao: "#95A5A6",    // Cinza
      clipes: "#8E44AD",    // Roxo escuro
      staff: "#34495E",     // Azul escuro
      safe: "#27AE60",      // Verde forte
      punicoes: "#C0392B"   // Vermelho escuro
    };

    // Função auxiliar para criar embeds
    function criarEmbed(titulo, cor, descricao) {
      return new EmbedBuilder()
        .setTitle(titulo)
        .setColor(cor)
        .setDescription(descricao);
    }

    // ===================== EMBEDS =====================
    const rp = criarEmbed(
      "🎭 1. ROLEPLAY & ANTI-RP",
      colors.rp,
      `
❌ **Anti-RP é proibido**
❌ Metagaming, Powergaming ou qualquer quebra de RP serão punidos.

☠️ **PK (Player Kill)**
• Morreu em ação?  
• **É PROIBIDO retornar à mesma ação em qualquer hipótese.**
`
    );

    const conduta = criarEmbed(
      "🧠 2. CONDUTA NO SERVIDOR",
      colors.conduta,
      `
✔️ RP sério, realista e coerente.
✔️ Respeito a todos os jogadores e STAFF.

❌ Proibido forçar situações fora do RP.
❌ Proibido misturar RPs  
*(Ex: policial agindo como civil)*.
`
    );

    const pvp = criarEmbed(
      "🔫 3. PVP, RAID & ROLETAGEM",
      colors.pvp,
      `
❌ PVP sem motivo de RP válido.
❌ Roletagem (matar sem interação).
❌ Raid ou Raid Tático.

⚠️ Raid **somente em eventos autorizados pela STAFF**.
`
    );

    const faccoes = criarEmbed(
      "🚓 4. MILÍCIA & FACÇÕES",
      colors.faccoes,
      `
🔫 **Roubos e assaltos permitidos apenas:**
🌧️ Durante chuva  
🌙 Durante a noite

🚨 **Contra Polícia (PM / VTR)**
✔️ Permitido a qualquer hora  
✔️ Necessário RP válido e coerente
`
    );

    const uniformes = criarEmbed(
      "👕 5. UNIFORMES & PROFISSÕES",
      colors.uniformes,
      `
👔 Uso obrigatório do uniforme correto da profissão.

❌ Proibido misturar RPs:
• Mecânico armado
• Médico em ação criminosa
`
    );

    const cacador = criarEmbed(
      "🏹 6. CAÇADOR & ZONA DE CAÇA",
      colors.cacador,
      `
🦌 Dentro da área de caça:
✔️ SAFE contra roubo e assalto

🚨 Fora da área:
❗ Sujeito às regras normais do servidor
`
    );

    const veiculos = criarEmbed(
      "🚗 7. VEÍCULOS EM AÇÃO",
      colors.veiculos,
      `
❌ Proibido atirar diretamente em veículos.
📢 Obrigatório dar **voz de rendição**.

🚗 Caso o veículo não obedeça:
✔️ Permitido atirar **somente nos pneus**
❌ Evitar atingir ocupantes
`
    );

    const reacao = criarEmbed(
      "🔁 8. REAÇÃO EM AÇÃO",
      colors.reacao,
      `
🔫 Caso o rendido reaja:
✔️ A ação pode evoluir conforme o RP.

⚠️ Execuções, abusos ou exageros sem RP serão punidos.
`
    );

    const clipes = criarEmbed(
      "🎥 9. CLIPAGEM (OBRIGATÓRIA)",
      colors.clipes,
      `
🎬 É obrigatório clipe para:
• Denúncias
• Revisões
• Problemas

❌ Sem clipe = **sem análise pela STAFF**
`
    );

    const staff = criarEmbed(
      "🛡️ 10. STAFF & ADMINISTRAÇÃO",
      colors.staff,
      `
👕 STAFF deve usar **roupa branca**.
🚙 Veículo oficial: **HMMWV (HUMV)**

❌ Proibido uso de Hunter ou outros veículos militares.
⚠️ Uso incorreto gera advertência interna.
`
    );

    const safe = criarEmbed(
      "🟢 11. ÁREA SAFE (ZONA SEGURA)",
      colors.safe,
      `
🛑 **PROIBIDA qualquer ação criminosa:**
❌ Roubo
❌ Assalto
❌ Assassinato
❌ Sequestro
❌ Ameaças ou intimidação

⚠️ Neutralidade total, independente de facção ou patente.
`
    );

    const punicoes = criarEmbed(
      "🔨 PUNIÇÕES & DISPOSIÇÕES FINAIS",
      colors.punicoes,
      `
🚫 **Infração leve** → Ban 1 dia  
🚫 **Infração média** → Ban 3 dias  
🚫 **Infração grave** → Ban 7 dias ou **BAN PERMANENTE**

❌ Anti-RP
❌ Raid / Roletagem
❌ Assassinato sem RP
❌ Abuso de mecânicas

📌 A STAFF tem a palavra final.
❤️ RP médio, sério e organizado.
`
    ).setFooter({ text: `Servidor: ${interaction.guild.name}` })
     .setTimestamp();

    // ===================== ENVIO =====================
    // Primeira mensagem (10 embeds)
    await canal.send({
      embeds: [rp, conduta, pvp, faccoes, uniformes, cacador, veiculos, reacao, clipes, staff]
    });

    // Segunda mensagem (restante dos embeds)
    await canal.send({
      embeds: [safe, punicoes]
    });

    // Resposta de confirmação
    await interaction.reply({
      content: `✅ Regras enviadas com sucesso no canal ${canal}.`,
      flags: 64
    });
  }
};

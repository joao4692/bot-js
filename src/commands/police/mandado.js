const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { getPoliceData, savePoliceData } = require("../../data/police/policeManager");
const { v4: uuidv4 } = require('uuid');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mandado")
    .setDescription("[POLÍCIA] Gerencia mandados de prisão.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand(sub =>
      sub.setName("emitir")
        .setDescription("Emite um mandado de prisão para um usuário.")
        .addUserOption(opt =>
          opt.setName("usuario")
            .setDescription("Usuário a ser alvo do mandado.")
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName("motivo")
            .setDescription("Motivo do mandado.")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("consultar")
        .setDescription("Consulta mandados de um usuário.")
        .addUserOption(opt =>
          opt.setName("usuario")
            .setDescription("Usuário para consulta.")
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName("revogar")
        .setDescription("Revoga um mandado de prisão.")
        .addStringOption(opt =>
          opt.setName("mandado_id")
            .setDescription("ID do mandado a ser revogado.")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser("usuario") || interaction.user;
    const policeData = await getPoliceData(target.id, interaction.guild.id);
    if (sub === "emitir") {
      const motivo = interaction.options.getString("motivo");
      if (!policeData.mandados) policeData.mandados = [];
      const mandado = {
        id: uuidv4(),
        motivo,
        data: Date.now(),
        oficial: interaction.user.id
      };
      policeData.mandados.push(mandado);
      await savePoliceData(target.id, interaction.guild.id, policeData);
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle("📄 Mandado Emitido")
          .setDescription(`Mandado emitido para ${target.tag}.`)
          .addFields(
            { name: "Motivo", value: motivo },
            { name: "ID do Mandado", value: mandado.id }
          )
          .setColor("#e74c3c")
          .setTimestamp()
        ],
        ephemeral: true
      });
    }
    if (sub === "consultar") {
      if (!policeData.mandados || policeData.mandados.length === 0) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle("Sem Mandados")
            .setDescription(`${target.tag} não possui mandados ativos.`)
            .setColor("#2ecc71")], ephemeral: true });
      }
      const embed = new EmbedBuilder()
        .setTitle(`📝 Mandados de Prisão de ${target.tag}`)
        .setColor("#e67e22")
        .setTimestamp();
      policeData.mandados.forEach(m => {
        embed.addFields({
          name: `ID: ${m.id}`,
          value: `Motivo: ${m.motivo}\nData: <t:${Math.floor(m.data/1000)}:f>\nOficial: <@${m.oficial}>`
        });
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === "revogar") {
      const id = interaction.options.getString("mandado_id");
      if (!policeData.mandados) policeData.mandados = [];
      const index = policeData.mandados.findIndex(m => m.id === id);
      if (index === -1) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setTitle("Mandado Não Encontrado")
            .setColor("#f1c40f")
            .setDescription(`ID ${id} não encontrado.`)
          ], ephemeral: true });
      }
      policeData.mandados.splice(index, 1);
      await savePoliceData(target.id, interaction.guild.id, policeData);
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle("Mandado Revogado")
          .setColor("#2ecc71")
          .setDescription(`Mandado ${id} foi revogado com sucesso.`)
        ], ephemeral: true });
    }
  }
};

const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addcargo")
    .setDescription("Adiciona um cargo em todos os membros ou bots")
    .addRoleOption(option =>
      option
        .setName("cargo")
        .setDescription("Cargo que será adicionado")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("tipo")
        .setDescription("Aplicar em membros ou bots")
        .setRequired(true)
        .addChoices(
          { name: "Membros", value: "membros" },
          { name: "Bots", value: "bots" }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const cargo = interaction.options.getRole("cargo");
    const tipo = interaction.options.getString("tipo");
    const guild = interaction.guild;

    await interaction.reply({
      content: "⏳ Adicionando cargo, aguarde...",
      ephemeral: true
    });

    let count = 0;

    // Puxa todos os membros do servidor
    const members = await guild.members.fetch();

    for (const member of members.values()) {

      // 🔹 SE FOR MEMBROS (humanos)
      if (tipo === "membros" && !member.user.bot) {
        if (!member.roles.cache.has(cargo.id)) {
          await member.roles.add(cargo).catch(() => {});
          count++;
        }
      }

      // 🔹 SE FOR BOTS
      if (tipo === "bots" && member.user.bot) {
        if (!member.roles.cache.has(cargo.id)) {
          await member.roles.add(cargo).catch(() => {});
          count++;
        }
      }
    }

    await interaction.editReply({
      content: `✅ Cargo **${cargo.name}** adicionado para **${count} ${tipo}**.`
    });
  }
};

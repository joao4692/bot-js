const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { getPoliceData, savePoliceData } = require("../../data/police/policeManager");
const { v4: uuidv4 } = require('uuid');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ocorrencia")
    .setDescription("[POLÍCIA] Registra uma ocorrência para um usuário.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // TODO: Change to a specific police role
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("O usuário para quem registrar a ocorrência.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("motivo")
        .setDescription("O motivo da ocorrência.")
        .setRequired(true)
    ),

  async execute(interaction, client, guildConfig) {
    const targetUser = interaction.options.getUser("usuario");
    const reason = interaction.options.getString("motivo");
    const officer = interaction.user;

    if (targetUser.bot || targetUser.id === officer.id) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ff0000").setDescription('❌ Você não pode registrar uma ocorrência para este usuário.')], ephemeral: true });
    }

    const policeData = await getPoliceData(targetUser.id, interaction.guild.id);

    const record = {
      recordId: uuidv4(),
      reason,
      officerId: officer.id,
      timestamp: new Date(),
    };

    policeData.records.push(record);
    await savePoliceData(targetUser.id, interaction.guild.id, policeData);

    const embed = new EmbedBuilder()
      .setTitle("📝 Ocorrência Registrada com Sucesso")
      .setDescription(`Uma ocorrência foi registrada para **${targetUser.tag}**.`)
      .setColor("#3498db")
      .addFields(
        { name: "Motivo da Ocorrência", value: reason },
      )
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: `Registrado pelo Oficial: ${officer.username}`, iconURL: officer.displayAvatarURL({ dynamic: true }) });

    interaction.reply({ embeds: [embed] });
  }
};

const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { getPoliceData, savePoliceData } = require("../../data/police/policeManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tirar-multa")
    .setDescription("[POLÍCIA] Remove uma multa de um usuário.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // TODO: Change to a specific police role
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("O usuário de quem remover a multa.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("multa_id")
        .setDescription("O ID da multa a ser removida.")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    if (!interaction.isAutocomplete()) return;
    const focusedOption = interaction.options.getFocused(true);
    const targetUser = interaction.options.getUser("usuario");

    if (focusedOption.name === 'multa_id' && targetUser) {
        try {
            const policeData = await getPoliceData(targetUser.id, interaction.guild.id);
            if (!policeData.fines || policeData.fines.length === 0) {
                return interaction.respond([{ name: 'Nenhuma multa encontrada para este usuário', value: 'none' }]);
            }

            const choices = policeData.fines.map(fine => {
                const fineId = fine.fineId || fine.id;
                const reason = fine.reason || fine.motivo || 'Sem motivo';
                return {
                    name: `ID: ${(String(fineId || 'N/A')).substring(0, 8)}... | Motivo: ${String(reason).substring(0, 50)}`,
                    value: String(fineId || 'none')
                };
            });
            
            const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toLowerCase()));
            await interaction.respond(filtered.slice(0, 25));
        } catch (error) {
            console.error('Autocomplete error in /tirar-multa:', error);
        }
    }
  },

  async execute(interaction, client, guildConfig) {
    const targetUser = interaction.options.getUser("usuario");
    const fineId = interaction.options.getString("multa_id");
    const officer = interaction.user;

    const policeData = await getPoliceData(targetUser.id, interaction.guild.id);

    const fineIndex = policeData.fines.findIndex(f => String(f.fineId || f.id) === String(fineId));

    if (fineId === 'none' || fineIndex === -1) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("#ffcc00").setDescription('⚠️ O ID da multa não foi encontrado ou é inválido.')], ephemeral: true });
    }

    const removedFine = policeData.fines[fineIndex];
    policeData.fines.splice(fineIndex, 1);

    await savePoliceData(targetUser.id, interaction.guild.id, policeData);

    const embed = new EmbedBuilder()
      .setTitle("✅ Multa Removida com Sucesso")
      .setDescription(`A multa de **${targetUser.tag}** foi removida por **${officer.tag}**.`)
      .setColor("#2ecc71")
      .addFields(
        { name: "ID da Multa Removida", value: `\`${removedFine.fineId || removedFine.id}\`` },
        { name: "Motivo Original", value: removedFine.reason || removedFine.motivo || 'Não informado' }
      )
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: `Oficial: ${officer.username}`, iconURL: officer.displayAvatarURL({ dynamic: true }) });

    interaction.reply({ embeds: [embed] });
  }
};

const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");
const { sendLog } = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("[MOD] Apaga uma quantidade de mensagens de um canal.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
    .addIntegerOption(option =>
      option.setName("quantia")
        .setDescription("O número de mensagens a serem apagadas (1-100).")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("Apagar mensagens apenas deste usuário.")
        .setRequired(false)
    ),
  async execute(interaction, client, guildConfig) {
    const amount = interaction.options.getInteger("quantia");
    const targetUser = interaction.options.getUser("usuario");
    const channel = interaction.channel;
    const moderator = interaction.user;

    if (!channel.permissionsFor(client.user).has(PermissionsBitField.Flags.ManageMessages)) {
        return await interaction.reply({ embeds: [new EmbedBuilder().setColor("#ff0000").setDescription('❌ Eu não tenho permissão para apagar mensagens neste canal.')], ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const messages = await channel.messages.fetch({ limit: amount });
    let filteredMessages = messages;

    if (targetUser) {
        filteredMessages = messages.filter(m => m.author.id === targetUser.id);
    }

    const messagesToDelete = filteredMessages.filter(m => !m.pinned && (Date.now() - m.createdTimestamp) < 1209600000); // Cannot delete messages older than 14 days

    if (messagesToDelete.size === 0) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor("#ffcc00").setDescription('⚠️ Nenhuma mensagem encontrada para apagar (mensagens com mais de 14 dias ou fixadas são ignoradas).')] });
    }

    try {
        const deletedMessages = await channel.bulkDelete(messagesToDelete, true);

        // Send log
        const logData = {
            title: '🗑️ Mensagens Apagadas',
            color: '#666666',
            fields: [
                { name: 'Canal', value: `${channel}`, inline: false },
                { name: 'Moderador', value: `${moderator.tag}`, inline: false },
                { name: 'Quantidade', value: `${deletedMessages.size}`, inline: false },
            ]
        };
        if (targetUser) {
            logData.fields.push({ name: 'Usuário Alvo', value: `${targetUser.tag}`, inline: false });
        }
        await sendLog(client, guildConfig, logData);

        // Send confirmation
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor("#00ff00").setDescription(`✅ ${deletedMessages.size} mensagens foram apagadas com sucesso.`)] });

    } catch (error) {
        console.error('Error during bulk delete:', error);
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor("#ff0000").setDescription('❌ Ocorreu um erro ao tentar apagar as mensagens.')] });
    }
  }
};

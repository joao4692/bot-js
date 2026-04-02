const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { saveGuildConfig } = require("../../utils/guildConfigManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-economy-mode")
    .setDescription("[ADMIN] Define o modo de economia do servidor.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addStringOption(option =>
      option.setName("modo")
        .setDescription("O modo de economia a ser usado.")
        .setRequired(true)
        .addChoices(
            { name: '🌍 Local (Apenas este servidor)', value: 'local' },
            { name: '🌎 Global (Todos os servidores)', value: 'global' },
            { name: '🔗 Interligado (Servidores específicos)', value: 'interconnected' }
        )
    ),
  async execute(interaction, client, guildConfig) {
    const newMode = interaction.options.getString("modo");
    
    guildConfig.economy.mode = newMode;
    await saveGuildConfig(interaction.guild.id, guildConfig);

    let description = `O modo de economia do servidor foi definido como **${newMode.charAt(0).toUpperCase() + newMode.slice(1)}**.`;
    let color = "#2ecc71"; // Green

    if (newMode === 'interconnected') {
        description += '\n\n⚠️ **Atenção:** Para que a economia interligada funcione, você deve adicionar os IDs dos outros servidores no arquivo de configuração deste servidor.';
        color = "#f1c40f"; // Yellow
    }

    const embed = new EmbedBuilder()
      .setTitle("⚙️ Modo de Economia Atualizado")
      .setDescription(description)
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: `Configurado por: ${interaction.user.tag}` });

    interaction.reply({ embeds: [embed] });
  }
};

const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("[ADMIN] Mostra a configuração atual do servidor.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(interaction, client, guildConfig) {

    const embed = new EmbedBuilder()
      .setTitle(`⚙️ Configuração de ${interaction.guild.name}`)
      .setColor(guildConfig.embedColor || '#0099ff')
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setTimestamp();

    // Economy Settings
    const economySettings = 
`**Modo:** ${guildConfig.economy.mode || 'local'}\n` +
`**Moeda:** ${guildConfig.economy.currency || '💰'}\n` +
`**Daily:** ${guildConfig.economy.dailyReward || 100}\n` +
`**Work (Min-Max):** ${guildConfig.economy.workReward?.min || 50} - ${guildConfig.economy.workReward?.max || 200}\n` +
`**Chance de Roubo:** ${guildConfig.economy.robChance * 100 || 40}%`;

    // RP Settings
    const rpSettings = `**Status:** ${guildConfig.rp.enabled ? 'Ativado' : 'Desativado'}`;

    // Log Channels
    const logTypes = [
      'loja', 'banco', 'economia', 'rp', 'policia', 'detran', 'hospital', 'governo', 'inventario', 'empregos'
    ];
    let logChannels = '';
    if (guildConfig.logs) {
      logTypes.forEach(type => {
        if (guildConfig.logs[type]) {
          logChannels += `• **${type}**: <#${guildConfig.logs[type]}>
`;
        }
      });
    }
    if (guildConfig.logChannel) {
      logChannels += `• **Padrão**: <#${guildConfig.logChannel}>`;
    }
    if (!logChannels) logChannels = 'Não definido';

    embed.addFields(
        { name: 'Economia', value: economySettings, inline: false },
        { name: 'Roleplay (RP)', value: rpSettings, inline: false },
        { name: 'Canais de Logs', value: logChannels, inline: false },
    );

    interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

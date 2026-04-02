const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');
const { checkPermission } = require('../../utils/permissionManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test-permissions')
    .setDescription('[ADMIN] Testa o sistema de permissões avançado'),

  async execute(interaction, client) {
    // Validar permissão usando o sistema unificado
    const permission = checkPermission(
      interaction.member, 
      interaction.guildId, 
      'test-permissions', 
      client?.application?.owner?.id
    );
    
    if (!permission.allowed) {
      return interaction.reply({
        content: `❌ ${permission.reason}`,
        ephemeral: true
      });
    }

    // Se chegou aqui, tem permissão!
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Permissão Validada')
      .addFields(
        { name: 'Comando', value: '/test-permissions', inline: true },
        { name: 'Status', value: 'Autorizado', inline: true },
        { name: 'Motivo', value: permission.reason, inline: true },
        { name: 'Usuário', value: interaction.user.toString(), inline: true },
        { name: 'Servidor', value: interaction.guild.name, inline: true }
      )
      .setDescription('Este é um comando de teste que valida permissões corretamente usando o novo sistema unificado!')
      .setTimestamp();

    return interaction.reply({
      embeds: [embed],
      ephemeral: false
    });
  }
};

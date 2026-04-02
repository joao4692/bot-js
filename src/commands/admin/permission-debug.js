const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { 
  checkPermission,
  getGuildConfig,
  getStatistics,
  PERMISSION_LEVELS
} = require('../../utils/advancedPermissionManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('permission-debug')
    .setDescription('[ADMIN] Ferramenta de debug para sistema de permissões')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuário para testar permissões')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('comando')
        .setDescription('Comando para testar')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('canal')
        .setDescription('ID do canal para testar (opcional)')
        .setRequired(false)
    ),

  async execute(interaction, client, guildConfig) {
    const user = interaction.options.getUser('usuario');
    const command = interaction.options.getString('comando');
    const channelId = interaction.options.getString('canal');

    // Buscar membro completo
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Usuário Não Encontrado')
        .setDescription('Não foi possível encontrar este usuário no servidor.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Realizar teste de permissão
    const permCheck = checkPermission(
      member,
      interaction.guildId,
      command,
      'command',
      { channelId }
    );

    // Obter configuração do servidor
    const serverConfig = getGuildConfig(interaction.guildId);
    
    // Obter estatísticas
    const stats = getStatistics(interaction.guildId);

    // Criar embed detalhado
    const embed = new EmbedBuilder()
      .setColor(permCheck.allowed ? '#00ff00' : '#ff0000')
      .setTitle(`🔍 Debug de Permissão: ${command}`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { 
          name: '👤 Usuário Testado', 
          value: `${user.toString()} (${user.id})`, 
          inline: true 
        },
        { 
          name: '⚙️ Comando', 
          value: `/${command}`, 
          inline: true 
        },
        { 
          name: '📺 Canal', 
          value: channelId ? `<#${channelId}>` : 'Qualquer canal', 
          inline: true 
        },
        { 
          name: '✅ Resultado', 
          value: permCheck.allowed ? '🟢 PERMITIDO' : '🔴 BLOQUEADO', 
          inline: true 
        },
        { 
          name: '📝 Motivo', 
          value: permCheck.reason || 'N/A', 
          inline: true 
        },
        { 
          name: '🔍 Fonte', 
          value: permCheck.source || 'N/A', 
          inline: true 
        }
      );

    // Informações do usuário
    embed.addFields({
      name: '👤 Informações do Usuário',
      value: `**Cargos:** ${member.roles.cache.map(r => r.toString()).join(', ') || 'Nenhum'}\n**Admin:** ${member.permissions.has(PermissionFlagsBits.Administrator) ? '✅ Sim' : '❌ Não'}\n**Dono:** ${member.id === interaction.guild.ownerId ? '✅ Sim' : '❌ Não'}`,
      inline: false
    });

    // Configurações do servidor
    embed.addFields({
      name: '⚙️ Configurações do Servidor',
      value: `**Nível Padrão:** ${serverConfig.settings.defaultLevel || 'MEMBER'}\n**Herança:** ${serverConfig.settings.inheritFromParent ? '✅ Ativada' : '❌ Desativada'}\n**Perms Temporárias:** ${serverConfig.settings.allowTemporaryPerms ? '✅ Ativadas' : '❌ Desativadas'}`,
      inline: false
    });

    // Estatísticas do sistema
    embed.addFields({
      name: '📊 Estatísticas do Sistema',
      value: `**Usuários:** ${stats.users}\n**Cargos:** ${stats.roles}\n**Canais:** ${stats.channels}\n**Temporárias:** ${stats.temporaryPermissions}`,
      inline: false
    });

    // Verificação detalhada se bloqueado
    if (!permCheck.allowed) {
      embed.addFields({
        name: '🔍 Análise de Bloqueio',
        value: 'O usuário foi bloqueado porque nenhuma das seguintes condições foi satisfeita:\n\n• 🎯 Permissão direta do usuário\n• 🛡️ Permissão de cargo\n• 📺 Permissão de canal\n• 🏆 Nível de permissão suficiente\n• ⏰ Permissão temporária ativa\n• 📂 Permissão de categoria',
        inline: false
      });
    }

    embed.setFooter({ 
      text: `Sistema de Permissões Avançado v3.0 | ${new Date().toLocaleString('pt-BR')}` 
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { listCommandPermissions, PERMISSION_LEVELS } = require('../../utils/permissionManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('perms-dashboard')
    .setDescription('Mostra um dashboard com todas as permissões configuradas')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guildId;

    try {
      const permissions = listCommandPermissions(guildId);

      if (permissions.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('📊 Dashboard de Permissões')
          .setDescription('✅ Nenhum comando com permissões customizadas\n\nTodos os comandos estão disponíveis para todos os usuários.');

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Separar por nível
      const byLevel = {};
      permissions.forEach(p => {
        if (!byLevel[p.level]) byLevel[p.level] = [];
        byLevel[p.level].push(p);
      });

      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('📊 Dashboard de Permissões')
        .setDescription(`Total de comandos customizados: **${permissions.length}**`)
        .setTimestamp();

      // Adicionar campos por nível
      Object.entries(byLevel).forEach(([level, commands]) => {
        const levelName = Object.keys(PERMISSION_LEVELS).find(k => PERMISSION_LEVELS[k] === level);
        const cmdList = commands.map(c => `• \`/${c.command}\``).join('\n');
        
        embed.addFields({
          name: `${levelName} (${commands.length})`,
          value: cmdList.length > 1024 ? cmdList.substring(0, 1021) + '...' : cmdList,
          inline: false
        });
      });

      // Adicionar resumo de permissões customizadas
      const customPerms = permissions.filter(p => p.level === PERMISSION_LEVELS.CUSTOM);
      if (customPerms.length > 0) {
        let customDetails = '';
        customPerms.forEach(p => {
          if (p.roles.length > 0) {
            customDetails += `\n**/${p.command}** → ${p.roles.length} cargo(s)`;
          }
          if (p.users.length > 0) {
            customDetails += `\n**/${p.command}** → ${p.users.length} usuário(s)`;
          }
        });

        if (customDetails) {
          embed.addFields({
            name: '🔧 Permissões Customizadas',
            value: customDetails,
            inline: false
          });
        }
      }

      const buttons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('perm_help')
            .setLabel('📚 Ajuda')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('perm_refresh')
            .setLabel('🔄 Atualizar')
            .setStyle(ButtonStyle.Primary)
        );

      const reply = await interaction.reply({ embeds: [embed], components: [buttons], ephemeral: true });

      // Handle button interactions
      const collector = reply.createMessageComponentCollector({ time: 300000 });

      collector.on('collect', async btn => {
        if (btn.user.id !== interaction.user.id) {
          return btn.reply({ content: 'Apenas quem executou o comando pode usar os botões.', ephemeral: true });
        }

        if (btn.customId === 'perm_help') {
          const helpEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📚 Ajuda: Sistema de Permissões')
            .addFields(
              { name: '/permission set-level', value: 'Define o nível de um comando', inline: false },
              { name: '/permission add-role', value: 'Autoriza um cargo', inline: false },
              { name: '/permission add-user', value: 'Autoriza um usuário', inline: false },
              { name: '/permission view', value: 'Vê permissões de um comando', inline: false },
              { name: '/permission list', value: 'Lista comandos customizados', inline: false },
              { name: 'Níveis Disponíveis', value: 
                '• **PUBLIC** - Qualquer um\n' +
                '• **STAFF** - Staff/Admin\n' +
                '• **ADMIN** - Administrador\n' +
                '• **OWNER** - Proprietário\n' +
                '• **CUSTOM** - Customizado',
                inline: false
              }
            );

          return btn.reply({ embeds: [helpEmbed], ephemeral: true });
        }

        if (btn.customId === 'perm_refresh') {
          await btn.deferUpdate();
          const freshPerms = listCommandPermissions(guildId);
          
          if (freshPerms.length === 0) {
            const newEmbed = new EmbedBuilder()
              .setColor('#00FF00')
              .setTitle('📊 Dashboard de Permissões')
              .setDescription('✅ Nenhum comando com permissões customizadas');
            
            return interaction.editReply({ embeds: [newEmbed] });
          }

          // Reconstruir embed
          const byLevelNew = {};
          freshPerms.forEach(p => {
            if (!byLevelNew[p.level]) byLevelNew[p.level] = [];
            byLevelNew[p.level].push(p);
          });

          const newEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📊 Dashboard de Permissões')
            .setDescription(`Total de comandos customizados: **${freshPerms.length}**`)
            .setTimestamp();

          Object.entries(byLevelNew).forEach(([level, commands]) => {
            const levelName = Object.keys(PERMISSION_LEVELS).find(k => PERMISSION_LEVELS[k] === level);
            const cmdList = commands.map(c => `• \`/${c.command}\``).join('\n');
            
            newEmbed.addFields({
              name: `${levelName} (${commands.length})`,
              value: cmdList.length > 1024 ? cmdList.substring(0, 1021) + '...' : cmdList,
              inline: false
            });
          });

          return interaction.editReply({ embeds: [newEmbed] });
        }
      });

      collector.on('end', () => {
        buttons.components.forEach(btn => btn.setDisabled(true));
        interaction.editReply({ components: [buttons] }).catch(() => {});
      });

    } catch (error) {
      console.error('Erro em perms-dashboard:', error);
      return interaction.reply({
        content: '❌ Erro ao processar comando.',
        ephemeral: true
      });
    }
  }
};

const { Events } = require('discord.js');
const { LOG_TYPES, sendLog } = require('../utils/logManager');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    try {
      const oldRoles = oldMember.roles.cache.map(r => r.id);
      const newRoles = newMember.roles.cache.map(r => r.id);

      // Verificar cargos adicionados
      const addedRoles = newRoles.filter(r => !oldRoles.includes(r));
      for (const roleId of addedRoles) {
        const role = newMember.guild.roles.cache.get(roleId);
        await sendLog(newMember.client, newMember.guild.id, LOG_TYPES.MEMBER_ROLE_ADD, {
          'Usuário': `${newMember.user.tag}`,
          'ID do Usuário': newMember.id,
          'Cargo': role?.name || 'Desconhecido',
          'ID do Cargo': roleId
        });
      }

      // Verificar cargos removidos
      const removedRoles = oldRoles.filter(r => !newRoles.includes(r));
      for (const roleId of removedRoles) {
        const role = oldMember.guild.roles.cache.get(roleId);
        await sendLog(newMember.client, newMember.guild.id, LOG_TYPES.MEMBER_ROLE_REMOVE, {
          'Usuário': `${newMember.user.tag}`,
          'ID do Usuário': newMember.id,
          'Cargo': role?.name || 'Desconhecido',
          'ID do Cargo': roleId
        });
      }

      // Verificar mudança de nick
      if (oldMember.nickname !== newMember.nickname) {
        await sendLog(newMember.client, newMember.guild.id, LOG_TYPES.MEMBER_UPDATE, {
          'Usuário': `${newMember.user.tag}`,
          'ID do Usuário': newMember.id,
          'Nick Anterior': oldMember.nickname || 'Nenhum',
          'Nick Novo': newMember.nickname || 'Nenhum'
        });
      }

    } catch (error) {
      console.error('Erro no log de atualização de membro:', error);
    }
  }
};

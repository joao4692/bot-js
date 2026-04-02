module.exports = {
  hasRole(member, roleId) {
    return member.roles.cache.has(roleId);
  },
  hasAnyRole(member, roles) {
    return roles.some(r => member.roles.cache.has(r));
  },
  isAdmin(member) {
    return member.permissions.has('Administrator');
  },
  hasPermission(member, perm) {
    return member.permissions.has(perm);
  }
};

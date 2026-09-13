const roleResource = (role) => ({
  id: role.id,
  name: role.name,
  description: role.description,
  isSystem: role.isSystem,
  permissions: role.permissions ? role.permissions.map((rp) => rp.permission.key) : undefined,
  userCount: role._count ? role._count.users : undefined,
});

const roleCollection = (roles) => roles.map(roleResource);

export { roleCollection, roleResource };

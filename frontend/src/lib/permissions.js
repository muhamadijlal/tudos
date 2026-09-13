export function hasPermission(user, permission) {
  return Boolean(user?.permissions?.includes(permission));
}

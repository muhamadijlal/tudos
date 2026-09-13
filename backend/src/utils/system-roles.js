// Nama 2 role bawaan (isSystem=true) yang di-seed lewat migration
// 20260912100000_add_rbac_roles. Dipakai make_admin.js & guardrail role.service.js.
export const SYSTEM_ROLES = {
  ADMIN: "Admin",
  MEMBER: "Member",
};

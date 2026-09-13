import prisma from "#prisma/client.js";
import ApiError from "#utils/ApiError.js";
import { PERMISSION_KEYS } from "#utils/permissions.js";
import { SYSTEM_ROLES } from "#utils/system-roles.js";

const includePermissions = {
  permissions: { include: { permission: true } },
  _count: { select: { users: true } },
};

export function findAll() {
  return prisma.role.findMany({
    include: includePermissions,
    orderBy: { id: "asc" },
  });
}

export async function findById(roleId) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: includePermissions,
  });

  if (!role) throw new ApiError(404, "Role not found");

  return role;
}

function assertValidPermissionKeys(permissionKeys) {
  const invalid = permissionKeys.filter((key) => !PERMISSION_KEYS.includes(key));
  if (invalid.length) {
    throw new ApiError(400, `Permission tidak valid: ${invalid.join(", ")}`);
  }
}

// Guardrail: role Admin (system) gak boleh dilucuti permission roles.manage —
// biar gak ada resiko semua admin ke-lock-out dari fitur role management.
function assertAdminKeepsRoleManage(role, permissionKeys) {
  if (role.isSystem && role.name === SYSTEM_ROLES.ADMIN && !permissionKeys.includes("roles.manage")) {
    throw new ApiError(400, `Permission "roles.manage" tidak boleh dicopot dari role ${SYSTEM_ROLES.ADMIN}`);
  }
}

export async function create({ name, description, permissionKeys = [] }) {
  assertValidPermissionKeys(permissionKeys);

  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) throw new ApiError(409, "Nama role sudah dipakai");

  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });

  return prisma.role.create({
    data: {
      name,
      description,
      permissions: { create: permissions.map((p) => ({ permissionId: p.id })) },
    },
    include: includePermissions,
  });
}

export async function update(roleId, { name, description, permissionKeys }) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new ApiError(404, "Role not found");

  if (name && name !== role.name) {
    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) throw new ApiError(409, "Nama role sudah dipakai");
  }

  if (permissionKeys) {
    assertValidPermissionKeys(permissionKeys);
    assertAdminKeepsRoleManage(role, permissionKeys);
  }

  const permissions = permissionKeys
    ? await prisma.permission.findMany({ where: { key: { in: permissionKeys } } })
    : null;

  return prisma.role.update({
    where: { id: roleId },
    data: {
      name,
      description,
      ...(permissions
        ? {
            permissions: {
              deleteMany: {},
              create: permissions.map((p) => ({ permissionId: p.id })),
            },
          }
        : {}),
    },
    include: includePermissions,
  });
}

export async function remove(roleId) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { _count: { select: { users: true } } },
  });

  if (!role) throw new ApiError(404, "Role not found");

  if (role.isSystem) {
    throw new ApiError(400, "Role bawaan tidak bisa dihapus");
  }

  if (role._count.users > 0) {
    throw new ApiError(409, `Role tidak bisa dihapus karena masih dipakai ${role._count.users} user`);
  }

  return prisma.role.delete({ where: { id: roleId } });
}

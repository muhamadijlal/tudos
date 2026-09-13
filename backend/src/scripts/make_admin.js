// Bootstrap: promosikan user existing jadi admin lewat CLI, dipakai sekali di awal
// karena endpoint PATCH /users/:id/role sendiri cuma bisa diakses oleh admin.
import "dotenv/config";
import prisma from "#prisma/client.js";
import { SYSTEM_ROLES } from "#utils/system-roles.js";

const email = process.argv[2];

if (!email) {
  console.error("Usage: node src/scripts/make_admin.js <email>");
  process.exit(1);
}

const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });

if (!user) {
  console.error(`User dengan email "${email}" tidak ditemukan`);
  process.exit(1);
}

const adminRole = await prisma.role.findUnique({ where: { name: SYSTEM_ROLES.ADMIN } });

if (!adminRole) {
  console.error(`Role "${SYSTEM_ROLES.ADMIN}" tidak ditemukan — jalankan migration dulu`);
  process.exit(1);
}

await prisma.user.update({
  where: { id: user.id },
  data: { roleId: adminRole.id },
});

console.log(`User "${email}" sekarang admin`);
await prisma.$disconnect();

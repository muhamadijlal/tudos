// Seed beberapa project dummy (masing-masing 1 epic + 1 task dengan rentang
// tanggal di sekitar hari ini) — buat demo halaman Timeline. Project sendiri
// gak lagi punya tanggal (cuma container) — rentang tanggal demo ditaruh di
// task-nya (Task masih punya startDate+dueDate penuh), Epic dapet dueDate
// (titik due doang, gak ada rentang). Aman di-rerun, tiap run bikin batch baru
// (kode epic unik).
import "dotenv/config";
import prisma from "#prisma/client.js";
import { generateUniqueEpicCode } from "#utils/epicCode.js";

const OWNER_EMAIL = "m.haidarijl@gmail.com";

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

const DUMMY_PROJECTS = [
  { name: "Bug Bash Sprint", startOffset: -1, durationDays: 2 }, // pendek, lagi jalan
  { name: "Q3 Marketing Campaign", startOffset: -10, durationDays: 8 }, // pendek, udah lewat due date
  { name: "API Gateway Migration", startOffset: -5, durationDays: 7 }, // pendek, due-nya deket
  { name: "Customer Portal Redesign", startOffset: 0, durationDays: 6 }, // pendek, mulai hari ini
  { name: "Security Audit", startOffset: 2, durationDays: 3 }, // pendek, mulai nanti
  { name: "Mobile App v2 Launch", startOffset: -3, durationDays: 52 }, // panjang, lagi jalan
  { name: "Data Warehouse Build", startOffset: 5, durationDays: 40 }, // panjang, mulai nanti
  { name: "Infrastructure Overhaul", startOffset: -21, durationDays: 75 }, // panjang, udah jalan lama
];

const owner = await prisma.user.findFirst({ where: { email: OWNER_EMAIL, deletedAt: null } });
if (!owner) throw new Error(`User dengan email ${OWNER_EMAIL} tidak ditemukan`);

const category = await prisma.category.findFirst({ where: { deletedAt: null } });
if (!category) throw new Error("Belum ada kategori task — bikin minimal 1 dulu");

for (const p of DUMMY_PROJECTS) {
  const startDate = addDays(today, p.startOffset);
  const dueDate = addDays(startDate, p.durationDays);

  const project = await prisma.project.create({
    data: {
      userId: owner.id,
      name: p.name,
      description: `Dummy project buat demo Timeline (${p.durationDays} hari).`,
    },
  });

  const epicCode = await generateUniqueEpicCode(p.name);
  const epic = await prisma.epic.create({
    data: {
      projectId: project.id,
      userId: owner.id,
      code: epicCode,
      taskCounter: 1,
      name: p.name,
      dueDate,
    },
  });

  await prisma.task.create({
    data: {
      epicId: epic.id,
      categoryId: category.id,
      sequence: 1,
      name: p.name,
      startDate,
      dueDate,
      assignees: { create: [{ userId: owner.id }] },
    },
  });

  console.log(
    `${epic.code} - ${project.name}: ${startDate.toDateString()} -> ${dueDate.toDateString()}`,
  );
}

console.log("Seed dummy Timeline selesai.");
await prisma.$disconnect();

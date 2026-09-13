// Seed beberapa project dummy dengan rentang tanggal di sekitar hari ini
// (macam-macam: pendek, panjang, udah lewat due date) — buat demo halaman
// Timeline. Aman di-rerun, tapi tiap run bikin batch baru (kode project unik).
import "dotenv/config";
import prisma from "#prisma/client.js";
import { generateUniqueProjectCode } from "#utils/projectCode.js";

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

for (const p of DUMMY_PROJECTS) {
  const code = await generateUniqueProjectCode(p.name);
  const startDate = addDays(today, p.startOffset);
  const dueDate = addDays(startDate, p.durationDays);

  const project = await prisma.project.create({
    data: {
      userId: owner.id,
      code,
      name: p.name,
      description: `Dummy project buat demo Timeline (${p.durationDays} hari).`,
      startDate,
      dueDate,
    },
  });

  console.log(
    `${project.code} - ${project.name}: ${startDate.toDateString()} -> ${dueDate.toDateString()}`,
  );
}

console.log("Seed dummy Timeline selesai.");
await prisma.$disconnect();

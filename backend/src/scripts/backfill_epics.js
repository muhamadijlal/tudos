// One-time backfill: rollout Project -> Epic -> Task. Bikin 1 Epic default
// "General" per project (reuse code + taskCounter project itu APA ADANYA,
// jangan digenerate ulang — biar kode task lama, mis. "DEM-6", tetap sama
// persis setelah task-nya dipindah ke Epic), lalu pindahin semua task lama
// ke situ. Aman di-rerun — project yang udah punya Epic di-skip.
import "dotenv/config";
import prisma from "#prisma/client.js";

// Tanpa filter deletedAt — project yang udah soft-deleted juga perlu Epic
// default, soalnya task lamanya (mungkin juga soft-deleted) tetap butuh
// epic_id non-null begitu migration finalize (20260915093000) dijalanin.
const projects = await prisma.project.findMany();

let projectCount = 0;
let taskCount = 0;

for (const project of projects) {
  const existing = await prisma.epic.findFirst({ where: { projectId: project.id } });
  if (existing) continue;

  const epic = await prisma.epic.create({
    data: {
      projectId: project.id,
      userId: project.userId,
      code: project.code,
      taskCounter: project.taskCounter,
      name: "General",
      dueDate: project.dueDate,
      deletedAt: project.deletedAt,
    },
  });

  const { count } = await prisma.task.updateMany({
    where: { projectId: project.id },
    data: { epicId: epic.id },
  });

  projectCount += 1;
  taskCount += count;
  console.log(`${project.name} (${project.code}) -> Epic "General" (${count} task)`);
}

console.log(`Backfill selesai: ${projectCount} project, ${taskCount} task dipindah ke Epic.`);
await prisma.$disconnect();

// One-time backfill: kasih `code` ke project lama & `sequence` ke task lama
// yang dibuat sebelum fitur kode ala Jira ada. Aman di-rerun — project yang
// udah punya code di-skip.
import "dotenv/config";
import prisma from "#prisma/client.js";
import { generateUniqueProjectCode } from "#utils/projectCode.js";

const projects = await prisma.project.findMany({ orderBy: { createdAt: "asc" } });

for (const project of projects) {
  if (project.code) continue;

  const code = await generateUniqueProjectCode(project.name);
  const tasks = await prisma.task.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "asc" },
  });

  await Promise.all(
    tasks.map((task, i) => prisma.task.update({ where: { id: task.id }, data: { sequence: i + 1 } })),
  );

  await prisma.project.update({
    where: { id: project.id },
    data: { code, taskCounter: tasks.length },
  });

  console.log(`${project.name} -> ${code} (${tasks.length} task)`);
}

console.log("Backfill selesai.");
await prisma.$disconnect();

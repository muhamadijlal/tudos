import { userResource } from "#resources/user.resource.js";

// Task ringkas per-epic (bukan full taskResource) — sama alasan kayak
// projectTaskSummary di project.resource.js: hindari circular import
// (task.resource.js butuh info epic balik), payload cukup buat list di
// halaman detail epic.
const epicTaskSummary = (task, epicCode) => ({
  id: task.id,
  code: epicCode ? `${epicCode}-${task.sequence}` : null,
  name: task.name,
  status: task.status,
  priority: task.priority,
  startDate: task.startDate ?? null,
  dueDate: task.dueDate ?? null,
  assignees: (task.assignees ?? []).map((a) => userResource(a.user)),
  category: task.category ? { id: task.category.id, name: task.category.name } : null,
  attachmentCount: task.attachments?.length ?? 0,
});

function epicProgress(tasks) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

// Dipakai buat list epic per-project (termasuk embedded di
// project.resource.js#projectResource) — ringan, `tasks` sumbernya cuma
// {id,status} (lihat epic.service.js#findAllByProject), dipakai buat hitung
// progress doang, gak dikembaliin mentah-mentah di sini.
const epicResource = (epic) => ({
  id: epic.id,
  projectId: epic.projectId,
  code: epic.code,
  // Kode task berikutnya kalau dibuat sekarang juga — preview di form Task
  // Baru, bukan buat disimpen.
  nextTaskCode: `${epic.code}-${epic.taskCounter + 1}`,
  name: epic.name,
  color: epic.color,
  description: epic.description ?? null,
  startDate: epic.startDate ?? null,
  dueDate: epic.dueDate ?? null,
  user: epic.user ? userResource(epic.user) : null,
  progress: epicProgress(epic.tasks ?? []),
  createdAt: epic.createdAt,
});

// Dipakai buat halaman detail 1 epic — project diringkas manual di sini
// (bukan projectResource penuh) biar gak circular import
// (project.resource.js sendiri butuh epicResource), + daftar task lengkap.
const epicDetailResource = (epic) => ({
  ...epicResource(epic),
  project: epic.project
    ? {
        id: epic.project.id,
        name: epic.project.name,
        user: epic.project.user ? userResource(epic.project.user) : null,
      }
    : null,
  tasks: (epic.tasks ?? []).map((task) => epicTaskSummary(task, epic.code)),
});

const epicCollection = (epics) => epics.map(epicResource);

export { epicCollection, epicDetailResource, epicResource };

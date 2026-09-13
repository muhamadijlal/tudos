import { userResource } from "#resources/user.resource.js";

// Ringkasan task terkait doang (bukan full taskResource) — biar gak ada
// circular import (task.resource.js sendiri butuh projectResource), dan
// payload-nya cukup buat kartu/list di dialog detail project.
const projectTaskSummary = (task, projectCode) => ({
  id: task.id,
  code: projectCode ? `${projectCode}-${task.sequence}` : null,
  name: task.name,
  status: task.status,
  priority: task.priority,
  startDate: task.startDate ?? null,
  dueDate: task.dueDate ?? null,
  assignees: (task.assignees ?? []).map((a) => userResource(a.user)),
  category: task.category ? { id: task.category.id, name: task.category.name } : null,
  attachmentCount: task.attachments?.length ?? 0,
});

const projectResource = (project) => ({
  id: project.id,
  code: project.code,
  // Kode task berikutnya kalau dibuat sekarang juga (project.code + counter
  // + 1) — dipakai buat preview di form Task Baru, bukan buat disimpen.
  nextTaskCode: `${project.code}-${project.taskCounter + 1}`,
  user: project.user ? userResource(project.user) : null,
  tasks: (project.tasks ?? []).map((task) => projectTaskSummary(task, project.code)),
  name: project.name,
  description: project.description ?? null,
  startDate: project.startDate ?? null,
  dueDate: project.dueDate ?? null,
  createdAt: project.createdAt,
});

const projectCollection = (projects) => projects.map(projectResource);

export { projectCollection, projectResource };

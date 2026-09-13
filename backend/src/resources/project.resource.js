import { epicResource } from "#resources/epic.resource.js";
import { userResource } from "#resources/user.resource.js";

// Ringkasan task terkait doang (bukan full taskResource) — biar gak ada
// circular import (task.resource.js sendiri butuh projectResource), dan
// payload-nya cukup buat kartu/list di dialog detail project.
const projectTaskSummary = (task, epicCode, epicId, epicColor) => ({
  id: task.id,
  code: epicCode ? `${epicCode}-${task.sequence}` : null,
  epicId,
  epicColor,
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
  user: project.user ? userResource(project.user) : null,
  epics: (project.epics ?? []).map(epicResource),
  // Backward-compat: flat semua task lintas-epic, shape sama persis kayak
  // sebelum Epic ada — cuma kode per-task sekarang ngikut epic-nya masing².
  tasks: (project.epics ?? []).flatMap((epic) =>
    (epic.tasks ?? []).map((task) => projectTaskSummary(task, epic.code, epic.id, epic.color)),
  ),
  name: project.name,
  description: project.description ?? null,
  createdAt: project.createdAt,
});

const projectCollection = (projects) => projects.map(projectResource);

export { projectCollection, projectResource };

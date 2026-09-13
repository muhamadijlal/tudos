import { categoryResource } from "#resources/category.resource.js";
import { projectResource } from "#resources/project.resource.js";
import { userResource } from "#resources/user.resource.js";

const taskResource = (task) => ({
  id: task.id,
  code: task.project?.code ? `${task.project.code}-${task.sequence}` : null,
  project: task.project ? projectResource(task.project) : {},
  assignees: (task.assignees ?? []).map((a) => userResource(a.user)),
  category: task.category ? categoryResource(task.category) : null,
  name: task.name,
  description: task.description ?? null,
  priority: task.priority,
  status: task.status,
  attachments: (task.attachments ?? []).map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    url: `/tasks/${task.id}/attachments/${attachment.id}`,
  })),
  startDate: task.startDate ?? null,
  dueDate: task.dueDate ?? null,
  reportDate: task.reportDate,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

const taskCollection = (tasks) => tasks.map(taskResource);

export { taskCollection, taskResource };

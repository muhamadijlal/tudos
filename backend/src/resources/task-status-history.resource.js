const taskStatusHistoryResource = (entry) => ({
  id: entry.id,
  taskId: entry.taskId,
  fromStatus: entry.fromStatus,
  toStatus: entry.toStatus,
  note: entry.note ?? null,
  user: entry.user ? { id: entry.user.id, name: entry.user.name } : null,
  createdAt: entry.createdAt,
});

const taskStatusHistoryCollection = (entries) => entries.map(taskStatusHistoryResource);

export { taskStatusHistoryCollection, taskStatusHistoryResource };

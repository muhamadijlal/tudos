const notificationResource = (notification) => ({
  id: notification.id,
  type: notification.type,
  message: notification.message,
  isRead: Boolean(notification.readAt),
  // Cuma keisi buat notifikasi komentar/balasan — dipakai frontend buat
  // nge-highlight & scroll ke komentar yang dimaksud.
  commentId: notification.commentId ?? null,
  task: notification.task
    ? {
        id: notification.task.id,
        code: notification.task.epic?.code
          ? `${notification.task.epic.code}-${notification.task.sequence}`
          : null,
        name: notification.task.name,
        epicId: notification.task.epicId,
      }
    : null,
  createdAt: notification.createdAt,
});

const notificationCollection = (notifications) => notifications.map(notificationResource);

export { notificationCollection, notificationResource };

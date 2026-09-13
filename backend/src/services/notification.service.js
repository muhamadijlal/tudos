import prisma from "#prisma/client.js";
import ApiError from "#utils/ApiError.js";

const RECENT_LIMIT = 50;

// Notifikasi selalu scoped ke user yang login (gak ada permission khusus —
// notifikasi cuma pernah dibuat buat diri sendiri lewat
// notifyAssigneesOfReviewOutcome() di task.service.js).
export function findRecentForUser(userId) {
  return prisma.notification.findMany({
    where: { userId },
    include: { task: { include: { project: true } } },
    orderBy: { createdAt: "desc" },
    take: RECENT_LIMIT,
  });
}

export function countUnreadForUser(userId) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markRead(notificationId, userId) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) throw new ApiError(404, "Notifikasi tidak ditemukan");

  if (notification.readAt) return notification;

  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markUnread(notificationId, userId) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) throw new ApiError(404, "Notifikasi tidak ditemukan");

  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: null },
  });
}

export async function remove(notificationId, userId) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) throw new ApiError(404, "Notifikasi tidak ditemukan");

  await prisma.notification.delete({ where: { id: notificationId } });
}

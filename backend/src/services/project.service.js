import prisma from "#prisma/client.js";
import ApiError from "#utils/ApiError.js";
import { generateUniqueProjectCode } from "#utils/projectCode.js";

// `assigneeId` diisi kalau caller-nya member — member cuma boleh lihat
// project yang (a) dia sendiri owner-nya (walau belum ada task sama sekali),
// atau (b) punya minimal 1 task dengan dirinya sebagai salah satu assignee-nya.
// Admin (permission projects.viewAll) lihat semua.
function memberScope(assigneeId) {
  return {
    OR: [
      { userId: assigneeId },
      { tasks: { some: { assignees: { some: { userId: assigneeId } }, deletedAt: null } } },
    ],
  };
}

export function findAll({ assigneeId } = {}) {
  return prisma.project.findMany({
    where: {
      deletedAt: null,
      ...(assigneeId ? memberScope(assigneeId) : {}),
    },
    include: {
      user: true,
      tasks: {
        where: { deletedAt: null },
        include: { assignees: { include: { user: true } } },
      },
    },
  });
}

export async function findById(projectId, { assigneeId } = {}) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      ...(assigneeId ? memberScope(assigneeId) : {}),
    },
    include: {
      user: true,
      tasks: {
        where: { deletedAt: null },
        include: {
          assignees: { include: { user: true } },
          category: true,
          attachments: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return project;
}

export async function create(data) {
  const user = await prisma.user.findFirst({
    where: { id: data.userId, deletedAt: null },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Kode ala Jira (mis. "WEB") di-generate otomatis dari nama, gak diisi user.
  const code = await generateUniqueProjectCode(data.name);
  return prisma.project.create({ data: { ...data, code } });
}

// Cuma owner project yang boleh edit/hapus project-nya — user lain (mis.
// yang jadi assignee task di project itu) cuma bisa baca. Sama persis
// polanya kayak project-note.service.js#assertIsOwner.
function assertIsOwner(project, requesterId) {
  if (project.userId !== requesterId) {
    throw new ApiError(403, "Cuma pemilik project yang bisa mengelola project ini");
  }
}

export async function update(projectId, requesterId, data) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
  });

  if (!project) {
    throw new ApiError(404, "Project not found");
  }
  assertIsOwner(project, requesterId);

  return prisma.project.update({ where: { id: projectId }, data });
}

export async function remove(projectId, requesterId) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
  });

  if (!project) {
    throw new ApiError(404, "Project not found");
  }
  assertIsOwner(project, requesterId);

  const taskCount = await prisma.task.count({
    where: { projectId, deletedAt: null },
  });

  if (taskCount > 0) {
    throw new ApiError(
      409,
      `Project tidak bisa dihapus karena masih memiliki ${taskCount} task terkait`,
    );
  }

  return prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: new Date() },
  });
}

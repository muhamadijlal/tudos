import prisma from "#prisma/client.js";
import ApiError from "#utils/ApiError.js";
import { generateUniqueEpicCode } from "#utils/epicCode.js";
import { nextEpicColor } from "#utils/epicColor.js";

// Cuma owner project yang boleh bikin/ubah/hapus epic — user lain (mis. yang
// jadi assignee task di project itu) cuma bisa baca (sama pola persis kayak
// project-note.service.js, gak ada pengecekan owner di findAllByProject/findById).
function assertIsOwner(project, requesterId) {
  if (project.userId !== requesterId) {
    throw new ApiError(403, "Cuma pemilik project yang bisa mengelola epic");
  }
}

// User dengan permission epics.assignOwner bebas assign owner epic ke siapa
// aja (atau kosongin/"Tanpa owner"). Selain itu owner-nya cuma boleh diri
// sendiri — beda dari assertCanAssign di task.service.js, di sini gak ada
// pengecualian "project owner" karena requester epic SELALU project owner
// (lihat assertIsOwner di atas), jadi percuma kalau dipakai juga di sini.
function assertCanAssignOwner(requester, targetUserId) {
  if (targetUserId === undefined || requester.permissions.includes("epics.assignOwner")) {
    return;
  }

  if (targetUserId !== requester.id) {
    throw new ApiError(403, "Kamu hanya bisa jadi owner epic untuk diri sendiri");
  }
}

export async function findAllByProject(projectId) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
  });

  if (!project) throw new ApiError(404, "Project not found");

  return prisma.epic.findMany({
    where: { projectId, deletedAt: null },
    include: {
      user: true,
      // Cukup id+status buat hitung progress (done/total) — gak perlu detail
      // penuh task di list epic per-project.
      tasks: { where: { deletedAt: null }, select: { id: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function findById(epicId) {
  const epic = await prisma.epic.findFirst({
    where: { id: epicId, deletedAt: null },
    include: {
      user: true,
      project: { include: { user: true } },
      tasks: {
        where: { deletedAt: null },
        include: { assignees: { include: { user: true } }, category: true, attachments: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!epic) throw new ApiError(404, "Epic not found");

  return epic;
}

export async function create(projectId, requester, data) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
  });

  if (!project) throw new ApiError(404, "Project not found");
  assertIsOwner(project, requester.id);
  assertCanAssignOwner(requester, data.userId ?? null);

  const code = await generateUniqueEpicCode(data.name);
  // Warna di-assign otomatis round-robin berdasarkan jumlah epic yang udah
  // ada di project ini (termasuk yang soft-deleted) — bukan pilihan user pas
  // create, biar epic-epic dalam 1 project langsung variatif warnanya kayak
  // Jira. Bisa diganti manual belakangan lewat update().
  const existingCount = await prisma.epic.count({ where: { projectId } });
  const color = nextEpicColor(existingCount);

  return prisma.epic.create({
    data: {
      projectId,
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      dueDate: data.dueDate,
      userId: data.userId ?? null,
      code,
      color,
    },
  });
}

export async function update(epicId, requester, data) {
  const epic = await prisma.epic.findFirst({
    where: { id: epicId, deletedAt: null },
    include: { project: true },
  });

  if (!epic) throw new ApiError(404, "Epic not found");
  assertIsOwner(epic.project, requester.id);
  assertCanAssignOwner(requester, data.userId);

  // code/projectId/taskCounter gak bisa diubah lewat sini — immutable pas
  // udah dibuat, sama kayak project.code sebelumnya. `color` boleh diganti
  // manual di sini (beda dari create() yang selalu auto-assign).
  return prisma.epic.update({
    where: { id: epicId },
    data: {
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      dueDate: data.dueDate,
      userId: data.userId,
      color: data.color,
    },
  });
}

export async function remove(epicId, requesterId) {
  const epic = await prisma.epic.findFirst({
    where: { id: epicId, deletedAt: null },
    include: { project: true },
  });

  if (!epic) throw new ApiError(404, "Epic not found");
  assertIsOwner(epic.project, requesterId);

  const taskCount = await prisma.task.count({ where: { epicId, deletedAt: null } });

  if (taskCount > 0) {
    throw new ApiError(
      409,
      `Epic tidak bisa dihapus karena masih memiliki ${taskCount} task terkait`,
    );
  }

  return prisma.epic.update({
    where: { id: epicId },
    data: { deletedAt: new Date() },
  });
}

import prisma from "#prisma/client.js";
import ApiError from "#utils/ApiError.js";
import { SYSTEM_ROLES } from "#utils/system-roles.js";
import fs from "fs/promises";
import path from "path";

// Hapus file lampiran dari disk — gagal (mis. udah ke-hapus manual) gak
// dianggap error, biar operasi utama tetap jalan.
async function deleteAttachmentFile(relativePath) {
  if (!relativePath) return;
  try {
    await fs.unlink(path.join(process.cwd(), relativePath));
  } catch {
    // noop
  }
}

// req.files (dari multer, array) -> baris nested-create buat relasi attachments.
function attachmentRows(files = []) {
  return files.map((file) => ({
    path: path.join("storage", "task", file.filename).replace(/\\/g, "/"),
    name: file.originalname,
  }));
}

// `assigneeId` diisi kalau caller-nya member (dari controller) — member cuma
// boleh lihat task yang salah satu assignee-nya dirinya sendiri, admin lihat semua.
export function findAll({ assigneeId } = {}) {
  return prisma.task.findMany({
    where: {
      deletedAt: null,
      ...(assigneeId ? { assignees: { some: { userId: assigneeId } } } : {}),
    },
    include: {
      epic: { include: { project: { include: { user: true } } } },
      assignees: { include: { user: true } },
      category: true,
      attachments: true,
    },
  });
}

export async function findById(taskId, { assigneeId } = {}) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      deletedAt: null,
      ...(assigneeId ? { assignees: { some: { userId: assigneeId } } } : {}),
    },
    include: {
      epic: { include: { project: { include: { user: true } } } },
      assignees: { include: { user: true } },
      category: true,
      attachments: true,
    },
  });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return task;
}

// Task "in_review" di project yang dimiliki `ownerId` — dipakai buat
// pengingat "perlu direview" ke owner project. Sengaja gak dibatasin
// permission apa pun (selain login), soalnya ini murni scoped ke project
// milik sendiri, sama kayak gating status Done/In Review di assertCanSetStatus().
export function findPendingReview(ownerId) {
  return prisma.task.findMany({
    where: {
      deletedAt: null,
      status: "in_review",
      epic: { deletedAt: null, project: { userId: ownerId, deletedAt: null } },
    },
    include: {
      epic: { include: { project: { include: { user: true } } } },
      assignees: { include: { user: true } },
      category: true,
      attachments: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function assertUsersExist(userIds) {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, deletedAt: null },
    include: { role: true },
  });

  if (users.length !== userIds.length) throw new ApiError(404, "user not found");
  return users;
}

// Selain Admin, siapa pun (termasuk yang punya tasks.assignOthers atau owner
// project) gak boleh assign task ke user dengan role Admin — biar Admin gak
// kebanjiran task dari member yang gak berwenang nugasin admin.
function assertCanAssignToAdmin(requester, targetUsers) {
  if (requester.role?.name === SYSTEM_ROLES.ADMIN) return;

  const targetsAdmin = targetUsers.some((u) => u.role?.name === SYSTEM_ROLES.ADMIN);
  if (targetsAdmin) {
    throw new ApiError(403, "Kamu tidak bisa assign task ke user dengan role Admin");
  }
}

// User dengan permission tasks.assignOthers bebas assign ke siapa aja (bisa
// lebih dari satu); owner project boleh sama juga di project-nya sendiri
// meski gak punya permission itu (ala Jira: project lead biasanya juga
// anggota role yang boleh assign). Selain itu assignee-nya cuma boleh diri
// sendiri (satu-satunya). `targetUserIds` undefined artinya assignee gak
// lagi diubah — gak perlu dicek.
function assertCanAssign(requester, targetUserIds, projectOwnerId) {
  if (
    targetUserIds === undefined ||
    requester.permissions.includes("tasks.assignOthers") ||
    requester.id === projectOwnerId
  ) {
    return;
  }

  if (targetUserIds.some((id) => id !== requester.id)) {
    throw new ApiError(403, "Kamu hanya bisa assign task ke diri sendiri");
  }
}

// Pindah ke "in_review" boleh sama owner project ATAU salah satu assignee
// task-nya (assignee yang minta di-review). Pindah ke "done" cuma boleh
// owner project (sign-off final). Transisi status lain (todo/in_progress)
// tetap bebas buat siapa aja, sama kayak sekarang.
function assertCanSetStatus(status, projectOwnerId, assigneeIds, requester) {
  const isOwner = projectOwnerId === requester.id;

  if (status === "done" && !isOwner) {
    throw new ApiError(403, "Cuma pemilik project yang bisa menandai task selesai (Done)");
  }

  if (status === "in_review" && !isOwner && !assigneeIds.includes(requester.id)) {
    throw new ApiError(
      403,
      "Cuma pemilik project atau assignee task ini yang bisa pindahin ke In Review",
    );
  }
}

// Transisi yang wajib disertai catatan (disepakati bareng user), biar selalu
// ada konteks kenapa perubahannya terjadi:
// - In Review -> Todo/In Progress: "dikembalikan" (direject reviewer).
// - Todo/In Progress -> In Review: "diajukan" buat direview (assignee
//   ngejelasin apa yang udah dikerjain).
// - Done -> Todo/In Progress: "dibuka lagi" (task yang udah kelar direvisi
//   lagi, wajib dijelasin kenapa).
// Transisi lain (termasuk In Review -> Done, approve) gak wajib.
function requiresReviewNote(fromStatus, toStatus) {
  if (fromStatus === "in_review" && (toStatus === "todo" || toStatus === "in_progress")) return true;
  if ((fromStatus === "todo" || fromStatus === "in_progress") && toStatus === "in_review") return true;
  if (fromStatus === "done" && (toStatus === "todo" || toStatus === "in_progress")) return true;
  return false;
}

const STATUS_LABELS = {
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

// Notifikasi in-app cuma dibuat buat 2 event "hasil review" (disepakati bareng
// user): task di-approve jadi Done, atau dikembalikan ke Todo/In Progress.
// Transisi status lain (termasuk masuk ke In Review) gak bikin notifikasi.
// Requester sendiri dikecualikan dari penerima (dia yang ngelakuin aksinya).
async function notifyAssigneesOfReviewOutcome({ task, code, toStatus, requester, note }) {
  const isApproved = toStatus === "done";
  const isReturned = toStatus === "todo" || toStatus === "in_progress";
  if (!isApproved && !isReturned) return;

  const recipients = task.assignees
    .map((a) => a.userId)
    .filter((userId) => userId !== requester.id);
  if (recipients.length === 0) return;

  const message = isApproved
    ? `Task ${code} disetujui dan ditandai selesai oleh ${requester.name}.`
    : `Task ${code} dikembalikan ke ${STATUS_LABELS[toStatus]} oleh ${requester.name}${note ? `: ${note}` : "."}`;

  await prisma.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      taskId: task.id,
      type: isApproved ? "task_review_approved" : "task_review_returned",
      message,
    })),
  });
}

// Riwayat perpindahan status — dipanggil dari controller (visibilitas task
// udah dicek di sana lewat findById), di sini tinggal query-nya doang.
export function listStatusHistory(taskId) {
  return prisma.taskStatusHistory.findMany({
    where: { taskId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function create(data, files = [], requester) {
  const { userIds, ...rest } = data;

  const [epic, category] = await Promise.all([
    prisma.epic.findFirst({
      where: { id: data.epicId, deletedAt: null },
      include: { project: true },
    }),
    prisma.category.findFirst({
      where: { id: data.categoryId, deletedAt: null },
    }),
  ]);

  if (!epic) throw new ApiError(404, "epic not found");
  if (!category) throw new ApiError(404, "category not found");
  const targetUsers = await assertUsersExist(userIds);
  assertCanAssign(requester, userIds, epic.project.userId);
  assertCanAssignToAdmin(requester, targetUsers);

  // Nomor urut task ala Jira (epic.code + sequence, mis. "WEB-12") — counter
  // di epic di-increment atomik biar gak ada nomor bentrok kalau dua task
  // dibuat bareng, dan nomornya gak pernah dipakai ulang meski task-nya dihapus.
  const updatedEpic = await prisma.epic.update({
    where: { id: data.epicId },
    data: { taskCounter: { increment: 1 } },
  });

  return prisma.task.create({
    data: {
      ...rest,
      sequence: updatedEpic.taskCounter,
      assignees: { create: userIds.map((userId) => ({ userId })) },
      attachments: files.length ? { create: attachmentRows(files) } : undefined,
    },
    include: { attachments: true },
  });
}

export async function update(taskId, data, files = [], requester) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    include: { assignees: true },
  });
  if (!task) throw new ApiError(404, "task not found");

  const [epic, category] = await Promise.all([
    data.epicId
      ? prisma.epic.findFirst({
          where: { id: data.epicId, deletedAt: null },
          include: { project: true },
        })
      : Promise.resolve(null),
    data.categoryId
      ? prisma.category.findFirst({
          where: { id: data.categoryId, deletedAt: null },
        })
      : Promise.resolve(null),
  ]);

  if (data.epicId && !epic) throw new ApiError(404, "epic not found");
  if (data.categoryId && !category) throw new ApiError(404, "category not found");
  const targetUsers = data.userIds ? await assertUsersExist(data.userIds) : null;

  // `epic` udah ke-fetch di atas kalau caller ngirim epicId (form edit
  // selalu ngirim ini) — cuma perlu fetch ekstra buat kasus Kanban
  // drag-and-drop yang cuma ngirim `{ status }` doang, atau assign-only.
  const statusChanging = data.status && data.status !== task.status;
  let owningEpic = epic;
  if (!owningEpic && (data.userIds || statusChanging)) {
    owningEpic = await prisma.epic.findFirst({
      where: { id: task.epicId },
      include: { project: true },
    });
  }

  if (data.userIds) {
    assertCanAssign(requester, data.userIds, owningEpic.project.userId);
    assertCanAssignToAdmin(requester, targetUsers);
  }

  if (statusChanging) {
    assertCanSetStatus(
      data.status,
      owningEpic.project.userId,
      task.assignees.map((a) => a.userId),
      requester,
    );

    if (requiresReviewNote(task.status, data.status) && !data.reviewNote?.trim()) {
      throw new ApiError(400, "Catatan wajib diisi untuk perubahan status ini");
    }
  }

  // Task pindah epic (kode-nya = epic.code + sequence) → nomor urut lama
  // gak relevan lagi di epic baru, jadi diambil nomor baru dari epic tujuan
  // (sama kayak Jira: issue yang dipindah project/epic dapet key baru).
  const movingEpic = data.epicId && data.epicId !== task.epicId;
  const sequence = movingEpic
    ? (
        await prisma.epic.update({
          where: { id: data.epicId },
          data: { taskCounter: { increment: 1 } },
        })
      ).taskCounter
    : undefined;

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      priority: data.priority,
      status: data.status,
      startDate: data.startDate,
      dueDate: data.dueDate,
      reportDate: data.reportDate,
      epicId: data.epicId,
      sequence,
      // Ganti seluruh set assignee lama dengan yang baru (bukan nambahin) —
      // cuma dieksekusi kalau userIds beneran dikirim (lihat data.userIds check di atas).
      assignees: data.userIds
        ? { deleteMany: {}, create: data.userIds.map((userId) => ({ userId })) }
        : undefined,
      // Lampiran baru cuma ditambahin, gak nimpa yang udah ada — hapus
      // lampiran lama dilakukan lewat removeAttachment() secara terpisah.
      attachments: files.length ? { create: attachmentRows(files) } : undefined,
    },
    include: { attachments: true },
  });

  if (statusChanging) {
    await prisma.taskStatusHistory.create({
      data: {
        taskId,
        userId: requester.id,
        fromStatus: task.status,
        toStatus: data.status,
        note: data.reviewNote?.trim() || null,
      },
    });

    if (task.status === "in_review") {
      await notifyAssigneesOfReviewOutcome({
        task,
        code: `${owningEpic.code}-${task.sequence}`,
        toStatus: data.status,
        requester,
        note: data.reviewNote?.trim(),
      });
    }
  }

  return updatedTask;
}

export async function removeAttachment(taskId, attachmentId) {
  const attachment = await prisma.taskAttachment.findFirst({
    where: { id: attachmentId, taskId },
  });

  if (!attachment) {
    throw new ApiError(404, "Lampiran tidak ditemukan");
  }

  await deleteAttachmentFile(attachment.path);

  return prisma.taskAttachment.delete({ where: { id: attachmentId } });
}

export async function remove(taskId) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
  });
  if (!task) throw new ApiError(404, "task not found");

  return prisma.task.update({
    where: { id: taskId },
    data: { deletedAt: new Date() },
  });
}

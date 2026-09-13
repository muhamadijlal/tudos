import prisma from "#prisma/client.js";
import ApiError from "#utils/ApiError.js";

// Visibilitas task (bisa dilihat requester ini atau enggak) udah dicek di
// controller lewat taskService.findById() sebelum manggil ini — di sini
// tinggal query komentarnya doang.
export function findAllByTask(taskId) {
  return prisma.taskComment.findMany({
    where: { taskId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
}

// Komentar baru (bukan balasan) -> notify semua assignee + owner project,
// kecuali penulisnya sendiri. Balasan -> notify cuma penulis komentar yang
// *diklik Balas-nya* (`target`, bisa komentar utama atau balasan lain — beda
// dari `parent` yang udah diratakan ke root buat penyimpanan), kalau beda
// orang. Gak notify semua assignee — biar gak spam tiap ada obrolan
// balik-balikan di 1 thread balasan.
async function notifyParticipants(task, comment, requester, target) {
  const code = task.epic?.code ? `${task.epic.code}-${task.sequence}` : `Task #${task.id}`;
  const excerpt = comment.content.length > 80 ? `${comment.content.slice(0, 80)}...` : comment.content;

  if (target) {
    if (target.userId === requester.id) return;
    await prisma.notification.create({
      data: {
        userId: target.userId,
        taskId: task.id,
        commentId: comment.id,
        type: "task_comment_replied",
        message: `${requester.name} membalas komentar kamu di task ${code}: "${excerpt}"`,
      },
    });
    return;
  }

  const recipientIds = new Set([...task.assignees.map((a) => a.userId), task.epic.project.userId]);
  recipientIds.delete(requester.id);
  if (recipientIds.size === 0) return;

  await prisma.notification.createMany({
    data: Array.from(recipientIds).map((userId) => ({
      userId,
      taskId: task.id,
      commentId: comment.id,
      type: "task_comment_added",
      message: `${requester.name} menambahkan komentar baru di task ${code}: "${excerpt}"`,
    })),
  });
}

// `task` udah di-fetch di controller (lewat taskService.findById, buat
// ngecek visibilitas) — dipakai ulang di sini biar gak query 2x, sekalian
// buat nentuin siapa aja yang perlu dinotif. `parentId` diisi kalau ini
// balasan — boleh nunjuk ke komentar utama ATAU ke balasan lain (`target`).
// Kalau nunjuk ke balasan, disimpannya "diratakan" ke root komentar itu
// (parentId beneran di DB = root-nya), bukan ke balasan yang diklik — biar
// tetep maksimal 2 level (gak ada balasan-dari-balasan yang menjorok terus),
// balasannya jadi sejajar (sibling) di bawah root yang sama. Notifikasinya
// tetep ngerujuk ke `target` asli (siapa yang responnya lagi dibales), bukan
// ke root, biar pesannya tetep akurat "membalas komentar KAMU".
export async function create(task, requester, content, parentId) {
  let target = null;
  let storedParentId = null;
  if (parentId) {
    target = await prisma.taskComment.findFirst({ where: { id: parentId, taskId: task.id } });
    if (!target) throw new ApiError(404, "Komentar yang mau dibales tidak ditemukan");
    storedParentId = target.parentId ?? target.id;
  }

  const comment = await prisma.taskComment.create({
    data: { taskId: task.id, userId: requester.id, content, parentId: storedParentId },
    include: { user: true },
  });

  await notifyParticipants(task, comment, requester, target);

  return comment;
}

// Cuma penulis komentar yang boleh hapus punya sendiri — gak ada bypass buat
// owner project/admin, sama kayak filosofi catatan project (assertIsOwner di
// project-note.service.js), biar konsisten: yang nulis yang berhak hapus.
// Ngehapus komentar utama otomatis nge-cascade balasan-balasannya juga (FK
// onDelete: Cascade di parent_id).
export async function remove(commentId, requesterId) {
  const comment = await prisma.taskComment.findFirst({ where: { id: commentId } });
  if (!comment) throw new ApiError(404, "Komentar tidak ditemukan");
  if (comment.userId !== requesterId) {
    throw new ApiError(403, "Kamu cuma bisa menghapus komentar sendiri");
  }

  await prisma.taskComment.delete({ where: { id: commentId } });
}

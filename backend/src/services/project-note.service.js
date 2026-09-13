import prisma from "#prisma/client.js";
import ApiError from "#utils/ApiError.js";

export async function findAllByProject(projectId) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
  });

  if (!project) throw new ApiError(404, "Project not found");

  return prisma.projectNote.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });
}

export async function findById(noteId) {
  const note = await prisma.projectNote.findFirst({
    where: { id: noteId, deletedAt: null },
  });

  if (!note) throw new ApiError(404, "Catatan tidak ditemukan");

  return note;
}

// Cuma owner project yang boleh nulis/ubah/hapus catatan — user lain (mis.
// yang jadi assignee task di project itu) cuma bisa baca (lihat
// findAllByProject/findById, gak ada pengecekan owner di situ).
function assertIsOwner(project, requesterId) {
  if (project.userId !== requesterId) {
    throw new ApiError(403, "Cuma pemilik project yang bisa mengelola catatan");
  }
}

export async function create(projectId, requesterId, { title, content }) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
  });

  if (!project) throw new ApiError(404, "Project not found");
  assertIsOwner(project, requesterId);

  return prisma.projectNote.create({
    data: { projectId, title, content: content ?? "" },
  });
}

export async function update(noteId, requesterId, data) {
  const note = await prisma.projectNote.findFirst({
    where: { id: noteId, deletedAt: null },
    include: { project: true },
  });

  if (!note) throw new ApiError(404, "Catatan tidak ditemukan");
  assertIsOwner(note.project, requesterId);

  return prisma.projectNote.update({ where: { id: noteId }, data });
}

export async function remove(noteId, requesterId) {
  const note = await prisma.projectNote.findFirst({
    where: { id: noteId, deletedAt: null },
    include: { project: true },
  });

  if (!note) throw new ApiError(404, "Catatan tidak ditemukan");
  assertIsOwner(note.project, requesterId);

  return prisma.projectNote.update({
    where: { id: noteId },
    data: { deletedAt: new Date() },
  });
}

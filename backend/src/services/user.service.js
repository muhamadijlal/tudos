import prisma from "#prisma/client.js";
import ApiError from "#utils/ApiError.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const PROFILE_PICTURE_DIR = path.join(process.cwd(), "storage", "profile_picture");

// Hapus file lama dari disk kalau ada — dipanggil sebelum nyimpen path baru
// (ganti foto) atau pas dihapus, biar gak numpuk file yatim di storage/.
// Sengaja gak dilempar kalau filenya udah gak ada (race condition/manual
// cleanup) — kegagalan hapus file lama gak boleh gagalin flow utama.
async function deleteProfilePictureFile(relativePath) {
  if (!relativePath) return;
  try {
    await fs.unlink(path.join(process.cwd(), relativePath));
  } catch {
    // file udah gak ada / gak bisa dihapus — abaikan
  }
}

// Foto profil apapun ukuran/rasio aslinya di-crop-tengah + resize jadi PAS
// 300x300, dijadiin JPEG (kompresi bagus & konsisten, gak peduli format
// input JPG/PNG/WEBP) — biar hemat storage & seragam pas ditampilin sebagai
// avatar di mana pun.
async function saveProfilePictureBuffer(buffer) {
  await fs.mkdir(PROFILE_PICTURE_DIR, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.jpg`;
  const absolutePath = path.join(PROFILE_PICTURE_DIR, filename);

  try {
    await sharp(buffer)
      .resize(300, 300, { fit: "cover", position: "centre" })
      .jpeg({ quality: 85 })
      .toFile(absolutePath);
  } catch {
    throw new ApiError(400, "File gambar tidak valid atau rusak");
  }

  return path.join("storage", "profile_picture", filename);
}

// Daftar minimal (id+nama doang) buat populate picker assignee — sengaja
// TERBUKA buat semua user login (beda dari findAll() yang dibatasin
// permission users.view), karena assign task ke orang lain sekarang bisa
// dilakuin siapa aja yang jadi owner project-nya, bukan cuma yang punya
// users.view.
export function findAllMinimal() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export function findAll() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    include: {
      role: true,
      ownedProjects: true,
      taskAssignments: { include: { task: true } },
    },
  });
}

export async function findById(userId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: {
      role: true,
      ownedProjects: true,
      taskAssignments: { include: { task: true } },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found!");
  }

  return user;
}

export async function update(userId, data) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return prisma.user.update({ where: { id: userId }, data, include: { role: true } });
}

export async function updateRole(userId, roleId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    throw new ApiError(404, "Role not found");
  }

  return prisma.user.update({
    where: { id: userId },
    data: { roleId },
    include: { role: true },
  });
}

// Self: wajib benerin currentPassword dulu. Admin ngubah password user lain:
// dianggap reset paksa, currentPassword gak diperiksa.
export async function updatePassword(userId, requester, { currentPassword, password }) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });

  if (!user) throw new ApiError(404, "User not found");

  const isSelf = requester.id === userId;
  if (isSelf) {
    if (!currentPassword) throw new ApiError(400, "Password saat ini wajib diisi");

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) throw new ApiError(401, "Password saat ini salah");
  }

  const hashPassword = await bcrypt.hash(password, 10);
  return prisma.user.update({ where: { id: userId }, data: { password: hashPassword } });
}

export async function updateProfilePicture(userId, buffer) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });

  if (!user) throw new ApiError(404, "User not found");

  const relativePath = await saveProfilePictureBuffer(buffer);
  await deleteProfilePictureFile(user.profilePicture);

  return prisma.user.update({
    where: { id: userId },
    data: { profilePicture: relativePath },
    include: { role: true },
  });
}

export async function removeProfilePicture(userId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });

  if (!user) throw new ApiError(404, "User not found");

  await deleteProfilePictureFile(user.profilePicture);

  return prisma.user.update({
    where: { id: userId },
    data: { profilePicture: null },
    include: { role: true },
  });
}

export async function remove(userId) {
  const user = await prisma.user.findFirst({ where: { id: userId } });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });
}

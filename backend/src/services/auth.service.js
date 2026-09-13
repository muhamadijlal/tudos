import prisma from "#prisma/client.js";
import ApiError from "#utils/ApiError.js";
import { SYSTEM_ROLES } from "#utils/system-roles.js";
import {
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashToken,
  signToken,
} from "#utils/jwt.js";
import bcrypt from "bcryptjs";

export async function register(payload) {
  const userExisting = await prisma.user.findFirst({
    where: { email: payload.email, deletedAt: null },
  });

  if (userExisting) throw new ApiError(409, "Email sudah terdaftar");

  const memberRole = await prisma.role.findUnique({ where: { name: SYSTEM_ROLES.MEMBER } });
  if (!memberRole) throw new ApiError(500, "Role default tidak ditemukan");

  // buat hash untuk password
  const hashPassword = await bcrypt.hash(payload.password, 10);
  return prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashPassword,
      roleId: memberRole.id,
      fullName: payload.fullName,
      nik: payload.nik,
      department: payload.department,
    },
    include: { role: true },
  });
}

export async function login(email, password) {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  if (!user) throw new ApiError(401, "Email atau password salah");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new ApiError(401, "Email atau password salah");

  const accessToken = signToken({ id: user.id, email: user.email });
  const refreshToken = await issueRefreshToken(user.id);

  return { accessToken, refreshToken, user };
}

export async function refreshAccessToken(refreshToken) {
  if (!refreshToken) throw new ApiError(401, "Refresh token diperlukan");

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash, revokedAt: null },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date() || stored.user.deletedAt) {
    throw new ApiError(401, "Refresh token tidak valid atau kadaluarsa");
  }

  // Rotasi: token lama langsung dicabut begitu dipakai.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const accessToken = signToken({
    id: stored.user.id,
    email: stored.user.email,
  });
  const newRefreshToken = await issueRefreshToken(stored.user.id);

  return { accessToken, refreshToken: newRefreshToken, user: stored.user };
}

export async function logout(refreshToken) {
  if (!refreshToken) return;

  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function issueRefreshToken(userId) {
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return refreshToken;
}

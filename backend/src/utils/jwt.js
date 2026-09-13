import crypto from "crypto";
import jwt from "jsonwebtoken";

export function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

// Refresh token: string acak (bukan JWT) supaya bisa di-lookup & di-revoke lewat DB.
export function generateRefreshToken() {
  return crypto.randomBytes(40).toString("hex");
}

// Cuma hash-nya yang disimpan di DB, biar token asli gak kebaca kalau DB bocor.
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiry() {
  const days = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

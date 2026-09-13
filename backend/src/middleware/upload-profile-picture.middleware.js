import ApiError from "#utils/ApiError.js";
import multer from "multer";

// memoryStorage (bukan diskStorage kayak upload.middleware.js) — file
// mentahnya cuma dibutuhin sebentar buat diproses sharp (resize+crop ke
// 300x300, lihat user.service.js#saveProfilePictureBuffer), gak perlu
// nyentuh disk dua kali (mentah + hasil olahan).
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new ApiError(400, "Tipe file tidak didukung. Gunakan JPG, PNG, atau WEBP."));
    }
    cb(null, true);
  },
}).single("profilePicture");

// Bungkus multer biar error-nya dikonversi jadi ApiError yang dikenali
// errorHandler global, bukan nyasar jadi 500 — sama pola kayak
// uploadTaskAttachments.
export default function uploadProfilePicture(req, res, next) {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new ApiError(400, "Ukuran file maksimal 1MB"));
      }
      return next(new ApiError(400, err.message));
    }
    if (err) return next(err);
    if (!req.file) return next(new ApiError(400, "File foto profil wajib diisi"));
    next();
  });
}

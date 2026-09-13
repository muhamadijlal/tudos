import ApiError from "#utils/ApiError.js";
import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import path from "path";

// process.cwd() = root project (tempat `node` dijalankan), sama kayak logger.js,
// jadi "storage/task" selalu mendarat di root backend, gak peduli lokasi file ini.
const uploadDir = path.join(process.cwd(), "storage", "task");
fs.mkdirSync(uploadDir, { recursive: true });

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB per file
const MAX_FILE_COUNT = 5; // maksimal lampiran per task dalam satu request

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-excel", // xls
  "text/csv",
  "application/csv",
  "application/pdf",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILE_COUNT },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new ApiError(400, "Tipe file tidak didukung. Gunakan JPG, PNG, XLSX, XLS, CSV, atau PDF."));
    }
    cb(null, true);
  },
}).array("attachments", MAX_FILE_COUNT);

// Bungkus multer biar error-nya (termasuk MulterError bawaan, mis. file kegedean)
// dikonversi jadi ApiError yang dikenali errorHandler global, bukan nyasar jadi 500.
export default function uploadTaskAttachments(req, res, next) {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new ApiError(400, "Ukuran file maksimal 2MB"));
      }
      if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
        return next(new ApiError(400, `Maksimal ${MAX_FILE_COUNT} file per task`));
      }
      return next(new ApiError(400, err.message));
    }
    if (err) return next(err);
    next();
  });
}

export { MAX_FILE_COUNT, uploadDir };

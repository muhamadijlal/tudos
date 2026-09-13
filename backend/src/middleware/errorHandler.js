import { logErrorDetail } from "#config/logger.js";

// Error handler terpusat: menangkap error yang di-throw dari route.
// Harus 4 argumen (err, req, res, next) agar dikenali Express sebagai error handler.
export default function errorHandler(err, req, res, next) {
  console.error(err);
  logErrorDetail(req, `${err.name || "Error"}: ${err.message}\n${err.stack}`);
  res.status(err.status || 500).json({ success: false, message: err.message });
}

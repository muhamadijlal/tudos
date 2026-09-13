import fs from "fs";
import morgan from "morgan";
import path from "path";

// ---- Log Directory ----
// process.cwd() = folder tempat `node` dijalankan (root project),
// jadi "logs" selalu mendarat di root, tidak peduli lokasi file ini.
const logDir = path.join(process.cwd(), "logs");
const errorDir = path.join(logDir, "error");

// Bikin folder log/error sekali saat modul di-load (aman kalau sudah ada).
fs.mkdirSync(errorDir, { recursive: true });

// Tanggal lokal yyyy-mm-dd untuk nama file harian.
function todayStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Tulis satu baris ke file log hari ini (dipakai bareng oleh Morgan & logDetail).
function appendToErrorLog(text) {
  const file = path.join(errorDir, `${todayStr()}.log`);
  fs.appendFile(file, text, (err) => {
    if (err) console.error("Error writing to log file:", err);
  });
}

// Stream custom buat Morgan: arahkan tiap tulisan ke file sesuai tanggal hari ini.
const errorLogStream = { write: appendToErrorLog };

// Middleware Morgan khusus error: hanya catat response status >= 400.
// Ini cuma nyatet baris access-log (IP, method, status) — TIDAK ada alasan
// errornya. Alasannya dicatat terpisah lewat logErrorDetail() di bawah,
// dipanggil dari validate.middleware.js & errorHandler.js.
const errorLogger = morgan(process.env.LOG_DEBUG || "combined", {
  stream: errorLogStream,
  skip: (req, res) => res.statusCode < 400,
});

// Baris independen (bertimestamp sendiri) berisi alasan error sebenarnya,
// supaya tetap jelas walau urutannya kepisah dari baris access-log Morgan.
function logErrorDetail(req, detail) {
  appendToErrorLog(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${detail}\n`);
}

export default errorLogger;
export { errorDir, logErrorDetail };

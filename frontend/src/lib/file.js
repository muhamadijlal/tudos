export const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024; // 2MB per file
export const MAX_ATTACHMENT_COUNT = 5; // maksimal lampiran per task
export const ATTACHMENT_ACCEPT = ".jpg,.jpeg,.png,.xlsx,.xls,.csv,.pdf";

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "xlsx", "xls", "csv", "pdf"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"];

export function getExtension(name = "") {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function isImageName(name) {
  return IMAGE_EXTENSIONS.includes(getExtension(name));
}

// Validasi sisi klien — pola & batasnya sama persis kayak yang dicek backend
// (src/middleware/upload.middleware.js), biar user dapet feedback instan
// sebelum request beneran dikirim.
export function validateAttachment(file) {
  if (!ALLOWED_EXTENSIONS.includes(getExtension(file.name))) {
    return "Tipe file tidak didukung. Gunakan JPG, PNG, XLSX, XLS, CSV, atau PDF.";
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return "Ukuran file maksimal 2MB.";
  }
  return null;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

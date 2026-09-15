export const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
];

export const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));
const PRIORITY_LABELS = Object.fromEntries(PRIORITY_OPTIONS.map((o) => [o.value, o.label]));

export function statusLabel(value) {
  return STATUS_LABELS[value] ?? value;
}

// Transisi yang wajib disertai catatan — sama persis aturan di backend
// (requiresReviewNote di task.service.js). Dipakai di frontend buat mutusin
// kapan perlu munculin ReviewNoteDialog sebelum ngirim PUT.
export function requiresReviewNote(fromStatus, toStatus) {
  if (fromStatus === "in_review" && (toStatus === "todo" || toStatus === "in_progress")) return true;
  if ((fromStatus === "todo" || fromStatus === "in_progress") && toStatus === "in_review") return true;
  if (fromStatus === "done" && (toStatus === "todo" || toStatus === "in_progress")) return true;
  return false;
}

// Approve final (In Review -> Done) satu-satunya transisi "penting" yang gak
// punya rem sama sekali (gak kayak transisi lain yang wajib catatan) —
// gampang ke-drag/ke-klik gak sengaja, makanya tetep perlu konfirmasi ringan
// (bukan catatan wajib, cuma ya/gak) sebelum beneran nutup task-nya.
export function requiresApproveConfirm(fromStatus, toStatus) {
  return fromStatus === "in_review" && toStatus === "done";
}

// Deskripsi kontekstual buat 1 baris transisi status di Aktivitas — dipakai
// bareng requiresReviewNote (transisi yang wajib catatan biasanya juga punya
// arti khusus buat ditampilin, bukan cuma "mengubah status").
export function describeStatusTransition(fromStatus, toStatus) {
  if (fromStatus === "in_review" && (toStatus === "todo" || toStatus === "in_progress")) {
    return "Dikembalikan dari";
  }
  if ((fromStatus === "todo" || fromStatus === "in_progress") && toStatus === "in_review") {
    return "Diajukan untuk review dari";
  }
  if (fromStatus === "done" && (toStatus === "todo" || toStatus === "in_progress")) {
    return "Dibuka kembali dari";
  }
  return "Mengubah status dari";
}

export function priorityLabel(value) {
  return PRIORITY_LABELS[value] ?? value;
}

// Warna per prioritas — dipakai di Badge (Tudos & Kanban).
export const PRIORITY_STYLES = {
  low: "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  medium: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
  high: "border-transparent bg-red-500/15 text-red-600 dark:text-red-300",
};

// Warna per status — dipakai di Select trigger (Tudos) & header kolom (Kanban).
export const STATUS_STYLES = {
  todo: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  in_progress: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  in_review: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  done: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
};

export const STATUS_DOT = {
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  in_review: "bg-amber-500",
  done: "bg-emerald-500",
};

// Warna hex per status — dipakai di chart (recharts butuh literal color,
// gak bisa baca class Tailwind/CSS var lewat `fill`).
export const STATUS_COLORS = {
  todo: "#94a3b8",
  in_progress: "#3b82f6",
  in_review: "#f59e0b",
  done: "#10b981",
};

export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// yyyy-mm-dd hari ini di zona waktu lokal (bukan toISOString, biar gak
// kegeser ke UTC) — default filter periode (Tudos/Kanban) dikunci ke hari
// ini, jadi butuh string ini buat nilai awal dueDateFrom/dueDateTo.
export function todayDateStr() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Sama kayak formatDate tapi ikut nampilin jam — dipakai buat timestamp yang
// presisi-nya lebih penting (komentar, riwayat status, notifikasi).
export function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Task dianggap butuh pengingat kalau due date-nya udah lewat, atau kurang
// dari DUE_SOON_DAYS hari lagi — kecuali task-nya udah "done" (gak relevan
// lagi buat diingetin).
export const DUE_SOON_DAYS = 3;

export function getDueStatus(task) {
  if (!task?.dueDate || task.status === "done") return null;

  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) return "overdue";
  if (diffDays <= DUE_SOON_DAYS) return "soon";
  return null;
}

// Warna due date yang butuh perhatian (dipakai sebagai badge) — pakai palet
// yang sama kayak PRIORITY_STYLES biar konsisten.
export const DUE_STATUS_STYLES = {
  overdue: "border-transparent bg-red-500/15 text-red-600 dark:text-red-300",
  soon: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

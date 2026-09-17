import { formatDate } from "@/lib/task";

// Ala Jira: Epic punya rentang (startDate+dueDate), tapi dua-duanya opsional
// — tampilin sebisanya (rentang penuh, cuma salah satu, atau "-" kalau
// kosong dua-duanya).
export function epicPeriodLabel(epic) {
  if (!epic.startDate && !epic.dueDate) return "-";
  if (epic.startDate && epic.dueDate) return `${formatDate(epic.startDate)} – ${formatDate(epic.dueDate)}`;
  return formatDate(epic.startDate ?? epic.dueDate);
}

// Belum ada field status di Epic — "closed" dihitung, bukan disimpan: semua
// task-nya (non-deleted) udah done. Epic tanpa task sama sekali (total 0)
// gak dianggap closed, biar epic baru gak langsung ilang dari pilihan.
export function isEpicClosed(epic) {
  const { total, done } = epic.progress ?? {};
  return Boolean(total) && done === total;
}

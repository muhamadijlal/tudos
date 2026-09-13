import { formatDate } from "@/lib/task";

// Ala Jira: Epic punya rentang (startDate+dueDate), tapi dua-duanya opsional
// — tampilin sebisanya (rentang penuh, cuma salah satu, atau "-" kalau
// kosong dua-duanya).
export function epicPeriodLabel(epic) {
  if (!epic.startDate && !epic.dueDate) return "-";
  if (epic.startDate && epic.dueDate) return `${formatDate(epic.startDate)} – ${formatDate(epic.dueDate)}`;
  return formatDate(epic.startDate ?? epic.dueDate);
}

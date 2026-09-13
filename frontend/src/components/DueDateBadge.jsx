import { Badge } from "@/components/ui/badge";
import { DUE_STATUS_STYLES, formatDate, getDueStatus } from "@/lib/task";
import { cn } from "@/lib/utils";

// Due date task jadi badge berwarna kalau butuh pengingat (lewat / mendekat)
// — dipakai bareng di Tudos, Kanban, & Dashboard biar tampilannya konsisten.
export function DueDateBadge({ task, className }) {
  const dueStatus = getDueStatus(task);

  if (!dueStatus) {
    return <span className={cn("text-muted-foreground", className)}>{formatDate(task.dueDate)}</span>;
  }

  return <Badge className={cn(DUE_STATUS_STYLES[dueStatus], className)}>{formatDate(task.dueDate)}</Badge>;
}

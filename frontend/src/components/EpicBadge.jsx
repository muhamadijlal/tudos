import { Badge } from "@/components/ui/badge";
import { EPIC_COLOR_STYLES } from "@/lib/epicColor";
import { cn } from "@/lib/utils";

// Chip nama epic berwarna (warna asli epic-nya, bukan hash kayak CodeBadge)
// — dipakai di Kanban/Tudos biar gampang bedain task dari epic mana secara
// visual sekilas, ala label Epic di Jira board.
export function EpicBadge({ epic, className }) {
  if (!epic) return null;

  return (
    <Badge
      variant="outline"
      className={cn(EPIC_COLOR_STYLES[epic.color] ?? EPIC_COLOR_STYLES.slate, className)}
    >
      {epic.name}
    </Badge>
  );
}

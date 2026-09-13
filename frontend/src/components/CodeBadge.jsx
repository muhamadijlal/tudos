import { Badge } from "@/components/ui/badge";
import { pickColor } from "@/lib/colorHash";
import { cn } from "@/lib/utils";

// Warna beda-beda per kode (hash deterministik, sama kode = sama warna
// selalu), bukan 1 warna buat semua badge — biar gampang bedain sekilas
// project/task mana yang mana pas banyak kartu berjejer.
const CODE_BADGE_COLORS = [
  "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300",
  "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-300",
  "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "border-lime-500/30 bg-lime-500/10 text-lime-700 dark:text-lime-300",
  "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  "border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-300",
  "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-300",
  "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300",
  "border-pink-500/30 bg-pink-500/10 text-pink-600 dark:text-pink-300",
  "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
];

// Buat task ("WEB-12"), warnanya di-hash dari prefix project-nya doang
// ("WEB") — biar semua task dalam 1 project konsisten satu warna, bukan
// warna acak per nomor urut task.
function colorSeed(code) {
  return code.split("-")[0];
}

export function CodeBadge({ children, className }) {
  if (!children) return null;

  return (
    <Badge
      variant="outline"
      className={cn("font-mono", pickColor(colorSeed(children), CODE_BADGE_COLORS), className)}
    >
      #{children}
    </Badge>
  );
}

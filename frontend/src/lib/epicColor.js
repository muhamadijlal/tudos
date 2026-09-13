// Sinkron persis sama EPIC_COLORS di backend/src/utils/epicColor.js — warna
// di-assign otomatis pas epic dibuat, bisa diganti manual lewat form edit.
export const EPIC_COLOR_OPTIONS = [
  "blue",
  "emerald",
  "purple",
  "amber",
  "pink",
  "teal",
  "red",
  "indigo",
  "orange",
  "slate",
];

// Chip/badge epic di Kanban & Tudos — pola sama kayak PRIORITY_STYLES/
// STATUS_STYLES di lib/task.js.
export const EPIC_COLOR_STYLES = {
  blue: "border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-300",
  emerald: "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  purple: "border-transparent bg-purple-500/15 text-purple-600 dark:text-purple-300",
  amber: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
  pink: "border-transparent bg-pink-500/15 text-pink-600 dark:text-pink-300",
  teal: "border-transparent bg-teal-500/15 text-teal-600 dark:text-teal-300",
  red: "border-transparent bg-red-500/15 text-red-600 dark:text-red-300",
  indigo: "border-transparent bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  orange: "border-transparent bg-orange-500/15 text-orange-600 dark:text-orange-300",
  slate: "border-transparent bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

// Dot/swatch polos (dipakai di picker warna & label epic di Timeline/detail).
export const EPIC_COLOR_DOT = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  purple: "bg-purple-500",
  amber: "bg-amber-500",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
  red: "bg-red-500",
  indigo: "bg-indigo-500",
  orange: "bg-orange-500",
  slate: "bg-slate-500",
};

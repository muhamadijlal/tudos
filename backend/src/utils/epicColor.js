// Palet warna epic ala Jira — di-assign otomatis round-robin pas epic dibuat
// (lihat nextEpicColor), bisa diganti manual lewat form edit epic. Key-nya
// dipakai frontend buat mapping ke class Tailwind (lihat
// frontend/src/lib/epicColor.js — pastikan daftarnya tetap sinkron).
export const EPIC_COLORS = [
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

// Round-robin berdasarkan jumlah epic yang udah ada di project itu (termasuk
// yang soft-deleted, biar warnanya tetap konsisten gak "geser" kalau ada yang
// dihapus) — bukan random, biar epic-epic dalam 1 project kebagian warna
// yang variatif satu sama lain.
export function nextEpicColor(existingCount) {
  return EPIC_COLORS[existingCount % EPIC_COLORS.length];
}

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { API_URL } from "@/lib/api";
import { pickColor } from "@/lib/colorHash";
import { cn } from "@/lib/utils";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Palet warna buat background avatar — dipilih deterministik dari id/nama
// (hash via pickColor), jadi "random" tapi tetap sama tiap kali orang yang
// sama muncul.
const AVATAR_COLORS = [
  "bg-red-500/15 text-red-600 dark:text-red-300",
  "bg-orange-500/15 text-orange-600 dark:text-orange-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-lime-500/15 text-lime-700 dark:text-lime-300",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  "bg-teal-500/15 text-teal-600 dark:text-teal-300",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
  "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  "bg-purple-500/15 text-purple-600 dark:text-purple-300",
  "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300",
  "bg-pink-500/15 text-pink-600 dark:text-pink-300",
  "bg-rose-500/15 text-rose-600 dark:text-rose-300",
];

function colorFor(seed) {
  return pickColor(seed, AVATAR_COLORS);
}

// "xs" bukan varian bawaan Avatar (cuma default/lg/sm) — dikontrol penuh lewat
// className di sini biar gak rebutan sama class data-[size=sm]:size-6 bawaan.
// `pictureUrl` opsional (path relatif dari userResource.profilePictureUrl,
// mis. "/profile-pictures/44") — endpoint-nya publik jadi tinggal digandeng
// API_URL, gak perlu fetch+blob kayak lampiran task. Kalau gambarnya gagal
// dimuat/kosong, otomatis balik ke initial (bawaan AvatarImage/Fallback).
export function AssigneeAvatar({ id, name, pictureUrl, size = "sm", className }) {
  const isXs = size === "xs";

  return (
    <Avatar
      size={isXs ? "default" : size}
      className={cn(isXs && "size-5", className)}
      title={name || "Belum ada assignee"}
    >
      {pictureUrl && <AvatarImage src={`${API_URL}${pictureUrl}`} alt={name} />}
      <AvatarFallback className={cn(colorFor(id ?? name), isXs && "text-[9px]")}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

import { getAccessToken } from "@/lib/api";

const API_URL = import.meta.env.VITE_API_URL;

function sanitizeFilename(title) {
  const cleaned = (title || "export").replace(/[^a-zA-Z0-9 _-]/g, "").trim();
  return cleaned || "export";
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatFilenameDate(date) {
  const d = new Date(date);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

// Dipakai tiap halaman buat nyusun akhiran nama file dari periode yang lagi
// difilter/ditampilin — kalau gak ada periode aktif (`from`/`to` kosong),
// fallback ke tanggal hari ini biar file yang di-export beda2 hari tetep
// gampang dibedain namanya.
export function filenamePeriodSuffix(from, to) {
  if (!from && !to) return formatFilenameDate(new Date());
  if (from && to) {
    const a = formatFilenameDate(from);
    const b = formatFilenameDate(to);
    return a === b ? a : `${a}_sd_${b}`;
  }
  return formatFilenameDate(from || to);
}

// Beda dari `api.js` biasa (yang selalu ngarepin JSON) — respons di sini
// binary (xlsx/pdf), jadi request-nya ditulis manual, bukan reuse `request()`.
// Data (title/columns/rows) udah sesuai apa yang lagi ditampilin/difilter di
// halaman pemanggil — backend cuma ngerender jadi file, gak query apa pun.
// `period` cuma dipakai buat nama file (gak dikirim ke backend) — nge-rename
// file hasil download di sisi client via atribut `download`, jadi gak
// pengaruh ke Content-Disposition/heading dokumennya.
async function requestExport(path, { title, columns, rows, period }, extension) {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ title, columns, rows }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || "Gagal membuat file export.");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const base = sanitizeFilename(title);
  a.download = period ? `${base}_${sanitizeFilename(period)}.${extension}` : `${base}.${extension}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// `columns`: [{ key, label, width? }] — `width` (dalam karakter, opsional)
// cuma dipakai sheet Excel. `rows`: array of object, key-nya harus cocok
// sama `columns[].key`. `period`: string opsional (lihat `filenamePeriodSuffix`)
// buat akhiran nama file.
export function exportToExcel(payload) {
  return requestExport("/exports/excel", payload, "xlsx");
}

export function exportToPdf(payload) {
  return requestExport("/exports/pdf", payload, "pdf");
}

// `tasks`: [{ project, name, createdAt }], `profile`: { fullName, nik, unit,
// supervisorName, supervisorNik } — beda dari exportToExcel/exportToPdf,
// backend di sini yang ngelakuin logic grouping per-bulan/per-hari (bukan
// cuma render tabel apa adanya), jadi request body-nya juga beda bentuk.
export async function exportDailyActivity({ tasks, profile }) {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/exports/daily-activity`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ tasks, profile }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || "Gagal membuat file export.");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(`Daily Activity - ${profile.fullName}`)}_${filenamePeriodSuffix()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

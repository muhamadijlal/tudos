import prisma from "#prisma/client.js";
import ApiError from "#utils/ApiError.js";

export function findAll() {
  return prisma.nationalHoliday.findMany({ orderBy: { date: "asc" } });
}

export async function findById(holidayId) {
  const holiday = await prisma.nationalHoliday.findUnique({ where: { id: holidayId } });

  if (!holiday) {
    throw new ApiError(404, "Libur nasional tidak ditemukan");
  }

  return holiday;
}

export async function create(data) {
  const existing = await prisma.nationalHoliday.findUnique({ where: { date: data.date } });
  if (existing) throw new ApiError(409, "Sudah ada libur nasional di tanggal ini");

  return prisma.nationalHoliday.create({ data });
}

export async function update(holidayId, data) {
  await findById(holidayId);

  const existing = await prisma.nationalHoliday.findFirst({
    where: { date: data.date, NOT: { id: holidayId } },
  });
  if (existing) throw new ApiError(409, "Sudah ada libur nasional di tanggal ini");

  return prisma.nationalHoliday.update({ where: { id: holidayId }, data });
}

export async function remove(holidayId) {
  await findById(holidayId);
  return prisma.nationalHoliday.delete({ where: { id: holidayId } });
}

// API publik gratis, gak butuh key, CORS terbuka (upset.dev/tanggalmerah) —
// dipanggil dari backend (bukan langsung dari frontend) biar tetep lewat
// alur create() yang sama (dedupe by date) & gak nempelin dependency
// eksternal ke bundle frontend. "leave" (cuti bersama) tetep diimpor sebagai
// hari libur juga (ditandain di nama), soalnya buat kebanyakan kantor swasta
// itu juga hari libur beneran.
const HOLIDAY_API_BASE = "https://tanggalmerah.upset.dev/api/holidays";

export async function syncFromYear(year) {
  let entries;
  try {
    const res = await fetch(`${HOLIDAY_API_BASE}?year=${year}`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const body = await res.json();
    entries = body?.data ?? [];
  } catch {
    throw new ApiError(502, "Gagal mengambil data libur dari API eksternal");
  }

  let created = 0;
  let skipped = 0;

  for (const entry of entries) {
    const date = new Date(`${entry.date}T00:00:00.000Z`);
    const existing = await prisma.nationalHoliday.findUnique({ where: { date } });
    if (existing) {
      skipped += 1;
      continue;
    }

    const name = entry.type === "leave" ? `${entry.name} (Cuti Bersama)` : entry.name;
    await prisma.nationalHoliday.create({ data: { date, name } });
    created += 1;
  }

  return { total: entries.length, created, skipped };
}

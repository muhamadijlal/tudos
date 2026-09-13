import ExcelJS from "exceljs";

// Semua tanggal di sini diperlakukan sebagai "tanggal kalender" murni (bukan
// timestamp) lewat kunci string "yyyy-mm-dd" + Date ber-anchor UTC tengah
// malam — biar perhitungan weekend/geser-hari gak kegeser timezone proses
// Node ini jalan di mana pun. `task.reportDate` ("Tanggal Laporan" — bebas
// diedit user ke tanggal manapun, beda dari createdAt yang dikunci ke saat
// task dibuat) dari frontend berupa ISO string ("2026-01-02T10:15:00.000Z"),
// tinggal `.slice(0,10)` buat ambil tanggalnya doang.
function pad(n) {
  return String(n).padStart(2, "0");
}

function toDateKeyFromDate(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function parseDateKey(key) {
  return new Date(`${key}T00:00:00.000Z`);
}

function addDaysToKey(key, amount) {
  const d = parseDateKey(key);
  d.setUTCDate(d.getUTCDate() + amount);
  return toDateKeyFromDate(d);
}

function weekdayIndex(key) {
  return parseDateKey(key).getUTCDay();
}

function isWeekendKey(key) {
  const dow = weekdayIndex(key);
  return dow === 0 || dow === 6;
}

function formatDateID(key) {
  return parseDateKey(key).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatWeekdayID(key) {
  return parseDateKey(key).toLocaleDateString("id-ID", { weekday: "long", timeZone: "UTC" });
}

function monthLabelID(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function daysInMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Geser terus ke hari berikutnya selama masih weekend atau libur nasional —
// dibatasin 366 iterasi jaga-jaga (data gak wajar) biar gak infinite loop.
function effectiveDateKey(key, holidayMap) {
  let cursor = key;
  for (let i = 0; i < 366; i++) {
    if (!isWeekendKey(cursor) && !holidayMap.has(cursor)) return cursor;
    cursor = addDaysToKey(cursor, 1);
  }
  return cursor;
}

const TITLE_FONT = { bold: true, size: 11, name: "Trebuchet MS", color: { theme: 1 } };
const HEADER_FONT = { bold: true, size: 12, name: "Trebuchet MS", color: { argb: "FF000000" } };
const BODY_FONT = { size: 12, name: "Calibri", color: { theme: 1 } };
const SIGN_FONT = { size: 11, name: "Calibri", color: { theme: 1 } };
const SIGN_TITLE_FONT = { bold: true, underline: true, size: 11, name: "Calibri", color: { theme: 1 } };

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBFBFBF" } };
const HOLIDAY_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFCCCC" } };
const WEEKDAY_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
// Kolom Tanggal dikasih aksen biru muda sendiri di hari kerja biar
// nonjol/gampang dipindai matanya (beda dari kolom Hari/Pekerjaan yang
// putih polos) — di hari libur/weekend tetap ke-override merah (lihat
// styleDataRow) biar penanda "libur"-nya tetep konsisten di 3 kolom.
const DATE_COL_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } };

const MEDIUM = { style: "medium" };
const THIN = { style: "thin" };

function styleHeaderCell(cell, { wrap = false } = {}) {
  cell.font = HEADER_FONT;
  cell.fill = HEADER_FILL;
  cell.border = { top: MEDIUM, bottom: MEDIUM, left: MEDIUM, right: MEDIUM };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: wrap };
}

function styleDataRow(sheet, rowNumber, { isOffDay, isFirst, isLast, isHoliday }) {
  const row = sheet.getRow(rowNumber);
  const fill = isOffDay ? HOLIDAY_FILL : WEEKDAY_FILL;

  const bCell = row.getCell(2);
  bCell.font = BODY_FONT;
  bCell.fill = isOffDay ? HOLIDAY_FILL : DATE_COL_FILL;
  bCell.alignment = { horizontal: "center", vertical: "middle" };
  bCell.border = {
    left: MEDIUM,
    right: THIN,
    top: isFirst ? MEDIUM : THIN,
    bottom: isLast ? MEDIUM : THIN,
  };

  const cCell = row.getCell(3);
  cCell.font = BODY_FONT;
  cCell.fill = fill;
  cCell.alignment = { horizontal: "center", vertical: "middle" };
  cCell.border = {
    left: THIN,
    right: THIN,
    top: isFirst ? MEDIUM : THIN,
    bottom: isLast ? MEDIUM : THIN,
  };

  const dCell = row.getCell(4);
  // Keterangan libur nasional (mis. "Libur Nasional: Hari Kemerdekaan
  // Indonesia") ditulis miring biar keliatan beda dari entri pekerjaan asli.
  dCell.font = isHoliday ? { ...BODY_FONT, italic: true } : BODY_FONT;
  dCell.fill = fill;
  dCell.alignment = {
    horizontal: isHoliday ? "center" : "left",
    vertical: "middle",
    wrapText: true,
  };
  dCell.border = {
    left: THIN,
    right: MEDIUM,
    top: isFirst ? MEDIUM : THIN,
    bottom: isLast ? MEDIUM : THIN,
  };
}

function buildMonthSheet(workbook, monthKey, { profile, rowsByDate, holidayMap }) {
  const sheet = workbook.addWorksheet(monthLabelID(monthKey).slice(0, 31));

  sheet.getColumn(1).width = 10.2;
  sheet.getColumn(2).width = 29;
  sheet.getColumn(3).width = 11.2;
  sheet.getColumn(4).width = 156;
  sheet.getColumn(5).width = 10.2;

  sheet.mergeCells("B2:D2");
  sheet.getCell("B2").value = "Daftar Kerja Karyawan";
  sheet.getCell("B2").font = TITLE_FONT;
  sheet.getCell("B2").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 25.5;

  sheet.mergeCells("B3:D3");
  sheet.getCell("B3").value = `Periode : ${monthLabelID(monthKey)}`;
  sheet.getCell("B3").font = TITLE_FONT;
  sheet.getCell("B3").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(3).height = 25.5;

  sheet.mergeCells("B5:D5");
  sheet.getCell("B5").value = `Nama : ${profile.fullName}`;
  sheet.getCell("B5").font = TITLE_FONT;
  sheet.getCell("B5").alignment = { horizontal: "left", vertical: "middle" };

  sheet.mergeCells("B6:D6");
  sheet.getCell("B6").value = `Department : ${profile.department}`;
  sheet.getCell("B6").font = TITLE_FONT;
  sheet.getCell("B6").alignment = { horizontal: "left", vertical: "middle" };

  const HEADER_ROW = 8;
  sheet.getCell(`B${HEADER_ROW}`).value = "Tanggal";
  styleHeaderCell(sheet.getCell(`B${HEADER_ROW}`));
  sheet.getCell(`C${HEADER_ROW}`).value = "Hari";
  styleHeaderCell(sheet.getCell(`C${HEADER_ROW}`));
  sheet.getCell(`D${HEADER_ROW}`).value = "Pekerjaan (Daily Activity)";
  styleHeaderCell(sheet.getCell(`D${HEADER_ROW}`), { wrap: true });
  // Sengaja gak nyetel row.height manual di sini juga — biar auto (sama
  // alasannya kayak baris data di bawah).

  const total = daysInMonth(monthKey);
  const dataStartRow = HEADER_ROW + 1;

  for (let day = 1; day <= total; day++) {
    const key = `${monthKey}-${pad(day)}`;
    const rowNumber = dataStartRow + day - 1;
    const row = sheet.getRow(rowNumber);
    const holidayName = holidayMap.get(key);
    const offDay = isWeekendKey(key) || Boolean(holidayName);
    const lines = offDay ? [] : (rowsByDate.get(key) ?? []);

    row.getCell(2).value = formatDateID(key);
    row.getCell(3).value = formatWeekdayID(key);
    row.getCell(4).value = holidayName ? `Libur Nasional: ${holidayName}` : lines.join("\n");

    styleDataRow(sheet, rowNumber, {
      isOffDay: offDay,
      isFirst: day === 1,
      isLast: day === total,
      isHoliday: Boolean(holidayName),
    });

    // Sengaja gak nyetel row.height manual — biarin kosong (auto) biar Excel
    // yang ngitung tinggi barisnya sendiri pas dibuka, ngikutin panjang teks
    // hasil wrap di kolom Pekerjaan (lebih akurat daripada heuristik jumlah
    // baris teks yang kita hitung manual).
  }

  const dataEndRow = dataStartRow + total - 1;
  const footerRow = dataEndRow + 2;

  sheet.getCell(`B${footerRow}`).value = profile.supervisorTitle;
  sheet.getCell(`B${footerRow}`).font = SIGN_FONT;
  sheet.getCell(`B${footerRow}`).alignment = { horizontal: "left", vertical: "middle" };

  sheet.getCell(`D${footerRow}`).value = `Jakarta, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`;
  sheet.getCell(`D${footerRow}`).font = SIGN_FONT;
  sheet.getCell(`D${footerRow}`).alignment = { horizontal: "right", vertical: "middle" };

  const nameRow = footerRow + 5;
  sheet.getCell(`B${nameRow}`).value = profile.supervisorName;
  sheet.getCell(`B${nameRow}`).font = SIGN_TITLE_FONT;
  sheet.getCell(`B${nameRow}`).alignment = { horizontal: "left", vertical: "top" };

  sheet.getCell(`D${nameRow}`).value = profile.fullName;
  sheet.getCell(`D${nameRow}`).font = SIGN_TITLE_FONT;
  sheet.getCell(`D${nameRow}`).alignment = { horizontal: "right", vertical: "middle" };

  const nikRow = nameRow + 1;
  sheet.getCell(`B${nikRow}`).value = `NIK : ${profile.supervisorNik}`;
  sheet.getCell(`B${nikRow}`).font = SIGN_FONT;
  sheet.getCell(`B${nikRow}`).alignment = { horizontal: "left", vertical: "middle" };

  sheet.getCell(`D${nikRow}`).value = `NIK : ${profile.nik}`;
  sheet.getCell(`D${nikRow}`).font = SIGN_FONT;
  sheet.getCell(`D${nikRow}`).alignment = { horizontal: "right", vertical: "middle" };
}

// `tasks`: [{ project, name, reportDate }] (reportDate ISO string dari
// task.reportDate — "Tanggal Laporan" yang bebas diedit user, bukan
// createdAt yang dikunci — dari data yang udah kefilter/ketampil di
// frontend, sama kayak export generik lainnya). `holidays`: [{ date, name }]
// (date Date object UTC-midnight, dari Prisma) — namanya ditulis di kolom
// Pekerjaan biar keliatan itu libur apa (mis. "Libur Nasional: Hari
// Kemerdekaan Indonesia"), bukan cuma kosong kayak weekend biasa.
export async function buildDailyActivityWorkbook({ tasks, profile, holidays }) {
  const holidayMap = new Map(holidays.map((h) => [toDateKeyFromDate(new Date(h.date)), h.name]));

  // Task yang jatuh di weekend/libur digeser ke hari kerja berikutnya —
  // ditumpuk ke bucket tanggal efektifnya bareng task lain yang emang asli
  // dibuat di hari itu.
  const rowsByDate = new Map();
  const monthsNeeded = new Set();

  for (const task of tasks) {
    const originalKey = task.reportDate.slice(0, 10);
    const effectiveKey = effectiveDateKey(originalKey, holidayMap);
    const line = `[${task.project}] - ${task.name}`;

    if (!rowsByDate.has(effectiveKey)) rowsByDate.set(effectiveKey, []);
    rowsByDate.get(effectiveKey).push(line);

    monthsNeeded.add(originalKey.slice(0, 7));
    monthsNeeded.add(effectiveKey.slice(0, 7));
  }

  const workbook = new ExcelJS.Workbook();
  const sortedMonths = Array.from(monthsNeeded).sort();

  // Gak ada task sama sekali -> tetap bikin 1 sheet buat bulan berjalan,
  // biar user tetap dapet file yang bisa diisi manual.
  if (sortedMonths.length === 0) {
    sortedMonths.push(toDateKeyFromDate(new Date()).slice(0, 7));
  }

  for (const monthKey of sortedMonths) {
    buildMonthSheet(workbook, monthKey, { profile, rowsByDate, holidayMap });
  }

  return workbook.xlsx.writeBuffer();
}

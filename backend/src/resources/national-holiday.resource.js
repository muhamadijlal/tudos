// `@db.Date` balik sebagai Date UTC-midnight dari Prisma — diformat manual ke
// "yyyy-mm-dd" (bukan .toISOString().slice(0,10) doang, sengaja pakai getter
// UTC biar konsisten walau proses Node-nya jalan di timezone lain).
function toDateStr(date) {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const nationalHolidayResource = (holiday) => ({
  id: holiday.id,
  date: toDateStr(holiday.date),
  name: holiday.name,
});

const nationalHolidayCollection = (holidays) => holidays.map(nationalHolidayResource);

export { nationalHolidayCollection, nationalHolidayResource };

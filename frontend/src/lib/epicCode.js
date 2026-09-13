// Replika persis dari backend/src/utils/epicCode.js#baseEpicCode — cuma
// buat preview di form, generate kode ASLI-nya tetap di server (dan bisa
// nambahin suffix 2/3/dst kalau basenya udah kepake epic lain).
export function baseEpicCode(name) {
  const alnum = (name ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const base = alnum.slice(0, 3) || "EPC";
  return base.length < 2 ? base.padEnd(2, "X") : base;
}

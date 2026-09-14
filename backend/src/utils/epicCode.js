import prisma from "#prisma/client.js";

// Kode pendek ala Jira, di-generate otomatis dari nama epic — 3
// huruf/angka pertama (non-alfanumerik dibuang), fallback "EPC" kalau nama
// kosong/isinya simbol semua.
export function baseEpicCode(name) {
  const alnum = (name ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const base = alnum.slice(0, 3) || "EPC";
  return base.length < 2 ? base.padEnd(2, "X") : base;
}

// Kode gak pernah dipakai ulang — termasuk epic yang udah di-soft-delete —
// unik GLOBAL (bukan cuma per-project), biar task code (epicCode-sequence)
// tetap gak ambigu di tampilan lintas-project kayak Tudos.
export async function generateUniqueEpicCode(name) {
  const base = baseEpicCode(name);
  let code = base;
  let suffix = 2;

  while (await prisma.epic.findFirst({ where: { code } })) {
    code = `${base}${suffix}`;
    suffix++;
  }

  return code;
}

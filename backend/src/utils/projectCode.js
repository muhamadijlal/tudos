import prisma from "#prisma/client.js";

// Kode pendek ala Jira, di-generate otomatis dari nama project — 3
// huruf/angka pertama (non-alfanumerik dibuang), fallback "PRJ" kalau nama
// kosong/isinya simbol semua.
export function baseProjectCode(name) {
  const alnum = (name ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const base = alnum.slice(0, 3) || "PRJ";
  return base.length < 2 ? base.padEnd(2, "X") : base;
}

// Kode gak pernah dipakai ulang — termasuk project yang udah di-soft-delete —
// mirip Jira, project key harus tetap unik permanen begitu di-generate.
export async function generateUniqueProjectCode(name) {
  const base = baseProjectCode(name);
  let code = base;
  let suffix = 2;

  while (await prisma.project.findFirst({ where: { code } })) {
    code = `${base}${suffix}`;
    suffix++;
  }

  return code;
}

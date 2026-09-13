// Hash string -> index deterministik ke palet warna — dipakai bareng sama
// AssigneeAvatar & CodeBadge biar "warna acak tapi konsisten" (orang/kode
// yang sama selalu dapet warna yang sama) gak duplikat logikanya di 2 tempat.
// Catatan: namanya hash ke N warna, jadi begitu jumlah item unik > panjang
// palet, tabrakan warna gak terhindarkan (pigeonhole) — palet-nya sengaja
// dibikin cukup panjang (16 hue) biar tabrakan jarang kejadian.
export function hashSeed(seed) {
  const str = String(seed ?? "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function pickColor(seed, palette) {
  return palette[hashSeed(seed) % palette.length];
}

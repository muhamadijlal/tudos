import { z } from "zod";

// Generik buat semua halaman (Tudos, Management Project, Timeline, Kanban,
// dll) — frontend yang nentuin kolom & baris apa aja (udah sesuai filter
// yang lagi aktif di halaman itu), backend tinggal ngerender jadi file.
// `rows` dibatasin biar gak ada payload raksasa yang bikin proses render PDF
// lambat/berat.
const ExportRequestValidation = z.object({
  body: z.object({
    title: z.string().min(1, "Judul wajib diisi").max(150, "Judul maksimal 150 karakter"),
    columns: z
      .array(
        z.object({
          key: z.string().min(1),
          label: z.string().min(1),
          width: z.number().positive().optional(),
        }),
      )
      .min(1, "Minimal 1 kolom"),
    rows: z.array(z.record(z.string(), z.unknown())).max(5000, "Maksimal 5000 baris per export"),
  }),
});

export { ExportRequestValidation };

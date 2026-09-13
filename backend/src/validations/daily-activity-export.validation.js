import { nikSchema } from "#validations/auth.validation.js";
import { z } from "zod";

const DailyActivityExportValidation = z.object({
  body: z.object({
    tasks: z
      .array(
        z.object({
          project: z.string().max(200),
          name: z.string().min(1).max(500),
          // ISO date/datetime string dari task.reportDate ("Tanggal Laporan"
          // — bebas diedit user, beda dari createdAt yang dikunci) — cuma
          // tanggalnya (10 karakter pertama) yang dipakai, lihat
          // daily-activity-export.service.js.
          reportDate: z.string().min(10),
        }),
      )
      .max(5000, "Maksimal 5000 task per export"),
    profile: z.object({
      fullName: z.string().min(1, "Nama lengkap wajib diisi").max(150),
      nik: nikSchema,
      department: z.string().min(1, "Department wajib diisi").max(100),
      supervisorName: z.string().min(1, "Nama penanggung jawab wajib diisi").max(150),
      supervisorNik: nikSchema,
      supervisorTitle: z.string().min(1, "Jabatan penanggung jawab wajib diisi").max(150),
    }),
  }),
});

export { DailyActivityExportValidation };

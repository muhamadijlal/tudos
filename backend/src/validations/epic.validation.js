import { EPIC_COLORS } from "#utils/epicColor.js";
import { z } from "zod";

const projectIdParam = z.object({
  id: z.coerce
    .number({ invalid_type_error: "ID harus berupa angka" })
    .int("ID harus berupa bilangan bulat"),
});

const epicIdParam = z.object({
  id: z.coerce
    .number({ invalid_type_error: "ID harus berupa angka" })
    .int("ID harus berupa bilangan bulat"),
});

const epicBody = {
  name: z
    .string({ error: "Nama epic wajib diisi" })
    .min(1, "Nama epic wajib diisi")
    .max(100, "Nama epic maksimal 100 karakter")
    .trim(),
  description: z.string().max(65535, "Deskripsi maksimal 65535 karakter").optional(),
  dueDate: z.coerce.date().optional().nullable(),
  userId: z.coerce.number().int().optional().nullable(),
};

const EpicListValidation = z.object({ params: projectIdParam });

const EpicStoreValidation = z.object({
  params: projectIdParam,
  body: z.object(epicBody),
});

const EpicFindByIdValidation = z.object({ params: epicIdParam });

const EpicUpdateValidation = z.object({
  params: epicIdParam,
  body: z.object({
    ...epicBody,
    name: epicBody.name.optional(),
    // Warna cuma bisa diubah lewat update — pas create selalu di-assign
    // otomatis round-robin (lihat epic.service.js#create).
    color: z.enum(EPIC_COLORS).optional(),
  }),
});

const EpicDeleteValidation = z.object({ params: epicIdParam });

export {
  EpicDeleteValidation,
  EpicFindByIdValidation,
  EpicListValidation,
  EpicStoreValidation,
  EpicUpdateValidation,
};

import { z } from "zod";

const dateSchema = z
  .string({ error: "Tanggal wajib diisi" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus yyyy-mm-dd");

const NationalHolidayStoreValidation = z.object({
  body: z.object({
    date: dateSchema,
    name: z
      .string({ error: "Nama libur wajib diisi" })
      .max(150, "Nama libur maksimal 150 karakter")
      .trim(),
  }),
});

const NationalHolidayUpdateValidation = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
  }),
  body: z.object({
    date: dateSchema,
    name: z
      .string({ error: "Nama libur wajib diisi" })
      .max(150, "Nama libur maksimal 150 karakter")
      .trim(),
  }),
});

const NationalHolidayDeleteValidation = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
  }),
});

const NationalHolidaySyncValidation = z.object({
  body: z.object({
    year: z.coerce
      .number({ invalid_type_error: "Tahun harus berupa angka" })
      .int("Tahun harus berupa bilangan bulat")
      .min(2000, "Tahun minimal 2000")
      .max(2100, "Tahun maksimal 2100"),
  }),
});

export {
  NationalHolidayDeleteValidation,
  NationalHolidaySyncValidation,
  NationalHolidayStoreValidation,
  NationalHolidayUpdateValidation,
};

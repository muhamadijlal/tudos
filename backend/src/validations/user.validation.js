import { nikSchema, passwordSchema } from "#validations/auth.validation.js";
import { z } from "zod";

const UserFindByIdValidation = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
  }),
});

const UserUpdateValidation = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
  }),
  body: z.object({
    name: z
      .string({ error: "Name is required" })
      .max(100, "Name max length is 100 character")
      .trim(),
    email: z.email("Invalid email address"),
    // Profil tambahan buat export Daily Activity — opsional di level route ini
    // (user lama yang register sebelum field ini ada mungkin belum punya),
    // tapi kalau dikirim tetap harus lolos aturan yang sama kayak register.
    fullName: z.string().max(150, "Nama lengkap maksimal 150 karakter").trim().optional(),
    nik: nikSchema.optional(),
    department: z.string().max(100, "Department maksimal 100 karakter").trim().optional(),
    supervisorName: z
      .string()
      .max(150, "Nama penanggung jawab maksimal 150 karakter")
      .trim()
      .optional(),
    supervisorNik: nikSchema.optional(),
    supervisorTitle: z
      .string()
      .max(150, "Jabatan penanggung jawab maksimal 150 karakter")
      .trim()
      .optional(),
  }),
});

const UserDeleteValidation = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
  }),
});

const UserRoleUpdateValidation = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
  }),
  body: z.object({
    roleId: z.coerce
      .number({ invalid_type_error: "Role ID harus berupa angka" })
      .int("Role ID harus berupa bilangan bulat")
      .positive("Role ID tidak valid"),
  }),
});

// `currentPassword` di sini opsional di level schema — wajib-atau-tidaknya
// tergantung siapa yang request (self vs admin), makanya dicek di
// user.service.js (service tahu req.user, schema ini enggak).
const UserPasswordUpdateValidation = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
  }),
  body: z
    .object({
      currentPassword: z.string().optional(),
      password: passwordSchema,
      passwordConfirmation: z.string(),
    })
    .refine((data) => data.password === data.passwordConfirmation, {
      message: "Konfirmasi password tidak cocok",
      path: ["passwordConfirmation"],
    }),
});

export {
  UserDeleteValidation,
  UserFindByIdValidation,
  UserPasswordUpdateValidation,
  UserRoleUpdateValidation,
  UserUpdateValidation,
};

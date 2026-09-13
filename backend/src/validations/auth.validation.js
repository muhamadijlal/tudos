import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Min password 8 character")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

// NIK cuma angka, 5-8 digit — sama persis aturan yang dipakai
// user.validation.js (UserUpdateValidation) buat field NIK yang sama.
const nikSchema = z
  .string({ error: "NIK wajib diisi" })
  .regex(/^\d{5,8}$/, "NIK harus berupa angka, 5-8 digit");

const RegisterValidation = z.object({
  body: z
    .object({
      name: z
        .string("Username is required")
        .max(100, "Username max length is 100 character")
        .trim(),
      email: z.email("Invalid email address"),
      password: passwordSchema,
      passwordConfirmation: z.string(),
      fullName: z
        .string({ error: "Nama lengkap wajib diisi" })
        .max(150, "Nama lengkap maksimal 150 karakter")
        .trim(),
      nik: nikSchema,
      department: z
        .string({ error: "Department wajib diisi" })
        .max(100, "Department maksimal 100 karakter")
        .trim(),
    })
    .refine((data) => data.password === data.passwordConfirmation, {
      message: "Konfirmasi password tidak cocok",
      path: ["passwordConfirmation"],
    }),
});

const LoginValidation = z.object({
  body: z.object({
    email: z.email("Invalid email address"),
    password: passwordSchema,
  }),
});

const RefreshTokenValidation = z.object({
  body: z.object({
    refreshToken: z.string("Refresh token is required"),
  }),
});

export { LoginValidation, nikSchema, passwordSchema, RefreshTokenValidation, RegisterValidation };

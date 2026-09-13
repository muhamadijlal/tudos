import { z } from "zod";

const idParam = z.object({
  id: z.coerce
    .number({ invalid_type_error: "ID harus berupa angka" })
    .int("ID harus berupa bilangan bulat"),
});

const RoleFindByIdValidation = z.object({ params: idParam });

const RoleStoreValidation = z.object({
  body: z.object({
    name: z
      .string({ error: "Nama role wajib diisi" })
      .min(1, "Nama role wajib diisi")
      .max(50, "Nama role maksimal 50 karakter")
      .trim(),
    description: z.string().max(255, "Deskripsi maksimal 255 karakter").trim().optional(),
    permissionKeys: z.array(z.string()).optional().default([]),
  }),
});

const RoleUpdateValidation = z.object({
  params: idParam,
  body: z.object({
    name: z
      .string()
      .min(1, "Nama role wajib diisi")
      .max(50, "Nama role maksimal 50 karakter")
      .trim()
      .optional(),
    description: z.string().max(255, "Deskripsi maksimal 255 karakter").trim().optional(),
    permissionKeys: z.array(z.string()).optional(),
  }),
});

const RoleDeleteValidation = z.object({ params: idParam });

export {
  RoleDeleteValidation,
  RoleFindByIdValidation,
  RoleStoreValidation,
  RoleUpdateValidation,
};

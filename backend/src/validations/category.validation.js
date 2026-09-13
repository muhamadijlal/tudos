import { z } from "zod";

const CategoryStoreValidation = z.object({
  body: z.object({
    name: z
      .string({ error: "Name is required" })
      .max(50, "Name max length is 50 character")
      .trim(),
  }),
});

const CategoryUpdateValidation = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
  }),
  body: z.object({
    name: z
      .string({ error: "Name is required" })
      .max(50, "Name max length is 50 character")
      .trim(),
  }),
});

const CategoryDeleteValidation = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
  }),
});

export { CategoryDeleteValidation, CategoryStoreValidation, CategoryUpdateValidation };

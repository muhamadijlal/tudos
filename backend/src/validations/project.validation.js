import { z } from "zod";

const ProjectStoreValidation = z.object({
  body: z.object({
    userId: z.coerce.number({ error: "userId is required" }).int(),
    name: z
      .string({ error: "Name is required" })
      .max(100, "Name max length is 100 character")
      .trim(),
    description: z.string().trim().optional(),
    startDate: z.coerce.date().nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
  }),
});

const ProjectFindByIdValidation = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
  }),
});

const ProjectUpdateValidation = z.object({
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
    description: z.string().trim().optional(),
    startDate: z.coerce.date().nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
  }),
});

const ProjectDeleteValidation = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
  }),
});

export {
  ProjectDeleteValidation,
  ProjectFindByIdValidation,
  ProjectStoreValidation,
  ProjectUpdateValidation,
};

import { z } from "zod";

const projectIdParam = z.object({
  id: z.coerce
    .number({ invalid_type_error: "ID harus berupa angka" })
    .int("ID harus berupa bilangan bulat"),
});

const noteIdParam = z.object({
  noteId: z.coerce
    .number({ invalid_type_error: "ID harus berupa angka" })
    .int("ID harus berupa bilangan bulat"),
});

const ProjectNoteListValidation = z.object({ params: projectIdParam });

const ProjectNoteStoreValidation = z.object({
  params: projectIdParam,
  body: z.object({
    title: z
      .string({ error: "Judul wajib diisi" })
      .min(1, "Judul wajib diisi")
      .max(150, "Judul maksimal 150 karakter")
      .trim(),
    content: z.string().max(65535, "Catatan maksimal 65535 karakter").optional(),
  }),
});

const ProjectNoteFindByIdValidation = z.object({ params: noteIdParam });

const ProjectNoteUpdateValidation = z.object({
  params: noteIdParam,
  body: z.object({
    title: z.string().min(1, "Judul wajib diisi").max(150, "Judul maksimal 150 karakter").trim().optional(),
    content: z.string().max(65535, "Catatan maksimal 65535 karakter").optional(),
  }),
});

const ProjectNoteDeleteValidation = z.object({ params: noteIdParam });

export {
  ProjectNoteDeleteValidation,
  ProjectNoteFindByIdValidation,
  ProjectNoteListValidation,
  ProjectNoteStoreValidation,
  ProjectNoteUpdateValidation,
};

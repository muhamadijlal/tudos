import { z } from "zod";

const taskIdParam = z.object({
  id: z.coerce
    .number({ invalid_type_error: "ID harus berupa angka" })
    .int("ID harus berupa bilangan bulat"),
});

const commentIdParam = z.object({
  commentId: z.coerce
    .number({ invalid_type_error: "ID harus berupa angka" })
    .int("ID harus berupa bilangan bulat"),
});

const TaskCommentListValidation = z.object({ params: taskIdParam });

const TaskCommentStoreValidation = z.object({
  params: taskIdParam,
  body: z.object({
    content: z
      .string({ error: "Komentar wajib diisi" })
      .min(1, "Komentar wajib diisi")
      .max(2000, "Komentar maksimal 2000 karakter")
      .trim(),
    // Diisi kalau ini balasan ke komentar utama — validasi "gak boleh balas
    // balasan" (maksimal 2 level) dicek di task-comment.service.js, butuh
    // query ke parent-nya dulu.
    parentId: z.coerce.number().int().positive().optional(),
  }),
});

const TaskCommentDeleteValidation = z.object({ params: commentIdParam });

export { TaskCommentDeleteValidation, TaskCommentListValidation, TaskCommentStoreValidation };

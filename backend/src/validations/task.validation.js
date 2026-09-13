import { z } from "zod";

const taskPriority = z.enum(["low", "medium", "high"]);
const taskStatus = z.enum(["todo", "in_progress", "in_review", "done"]);

// FormData/multer ngirim field berulang (`userIds` dipilih lebih dari 1x)
// sebagai array, tapi kalau cuma 1 nilai dikirim jadi string tunggal — di-
// normalize dulu jadi array sebelum divalidasi, biar konsisten di kedua kasus.
function toArray(value) {
  if (value === undefined) return value;
  return Array.isArray(value) ? value : [value];
}

const userIdsRequired = z.preprocess(
  toArray,
  z.array(z.coerce.number().int()).min(1, "Minimal pilih 1 assignee"),
);
const userIdsOptional = z.preprocess(
  toArray,
  z.array(z.coerce.number().int()).min(1, "Minimal pilih 1 assignee").optional(),
);

const TaskStoreValidation = z.object({
  body: z.object({
    projectId: z.coerce.number({ error: "projectId is required" }).int(),
    userIds: userIdsRequired,
    categoryId: z.coerce.number({ error: "categoryId is required" }).int(),
    name: z
      .string({ error: "Name is required" })
      .max(100, "Name max length is 100 character")
      .trim(),
    description: z.string().trim().optional(),
    priority: taskPriority.optional(),
    status: taskStatus.optional(),
    startDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
    reportDate: z.coerce.date({ error: "Tanggal laporan wajib diisi" }),
  }),
});

const TaskFindByIdValidation = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
  }),
});

const TaskUpdateValidation = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
  }),
  body: z.object({
    projectId: z.coerce.number().int().optional(),
    userIds: userIdsOptional,
    categoryId: z.coerce.number().int().optional(),
    name: z
      .string()
      .max(100, "Name max length is 100 character")
      .trim()
      .optional(),
    description: z.string().trim().optional(),
    priority: taskPriority.optional(),
    status: taskStatus.optional(),
    // Wajib diisi buat sebagian transisi status (lihat requiresReviewNote di
    // task.service.js) — dicek kondisional di sana (butuh status lama
    // task-nya dulu buat tau transisi ini butuh catatan atau enggak), bukan
    // di sini.
    reviewNote: z.string().trim().max(1000, "Catatan maksimal 1000 karakter").optional(),
    startDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
    reportDate: z.coerce.date().optional(),
  }),
});

const TaskDeleteValidation = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
  }),
});

const TaskAttachmentValidation = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
    attachmentId: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
  }),
});

export {
  TaskAttachmentValidation,
  TaskDeleteValidation,
  TaskFindByIdValidation,
  TaskStoreValidation,
  TaskUpdateValidation,
};

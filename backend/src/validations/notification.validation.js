import { z } from "zod";

// Dipakai bareng buat mark-read/unread/delete — ketiganya cuma butuh
// validasi param `id` yang sama.
const NotificationIdParamValidation = z.object({
  params: z.object({
    id: z.coerce
      .number({ invalid_type_error: "ID harus berupa angka" })
      .int("ID harus berupa bilangan bulat"),
  }),
});

export { NotificationIdParamValidation };

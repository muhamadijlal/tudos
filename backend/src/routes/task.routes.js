import uploadTaskAttachments from "#middleware/upload.middleware.js";
import {
  TaskCommentListValidation,
  TaskCommentStoreValidation,
} from "#validations/task-comment.validation.js";
import {
  TaskAttachmentValidation,
  TaskDeleteValidation,
  TaskFindByIdValidation,
  TaskStoreValidation,
  TaskUpdateValidation,
} from "#validations/task.validation.js";
import { Router } from "express";
import taskCommentController from "../controllers/task-comment.controller.js";
import taskController from "../controllers/task.controller.js";
import validate from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", taskController.getAllTasks);
router.get("/review-pending", taskController.getPendingReviewTasks);
router.get(
  "/:id",
  validate(TaskFindByIdValidation),
  taskController.getTaskById,
);
router.get(
  "/:id/attachments/:attachmentId",
  validate(TaskAttachmentValidation),
  taskController.downloadAttachment,
);
// Komentar (list/create) & log perpindahan status — operasi per-komentar
// (delete by commentId) ada di #routes/task-comment.routes.js (/task-comments).
router.get(
  "/:id/comments",
  validate(TaskCommentListValidation),
  taskCommentController.getComments,
);
router.post(
  "/:id/comments",
  validate(TaskCommentStoreValidation),
  taskCommentController.createComment,
);
router.get(
  "/:id/history",
  validate(TaskFindByIdValidation),
  taskController.getStatusHistory,
);
router.post(
  "/",
  uploadTaskAttachments,
  validate(TaskStoreValidation),
  taskController.createTask,
);
router.put(
  "/:id",
  uploadTaskAttachments,
  validate(TaskUpdateValidation),
  taskController.updateTask,
);
router.delete(
  "/:id/attachments/:attachmentId",
  validate(TaskAttachmentValidation),
  taskController.removeAttachment,
);
router.delete(
  "/:id",
  validate(TaskDeleteValidation),
  taskController.deleteTask,
);

export default router;

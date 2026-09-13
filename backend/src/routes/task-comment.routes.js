import taskCommentController from "#controllers/task-comment.controller.js";
import validate from "#middleware/validate.middleware.js";
import { TaskCommentDeleteValidation } from "#validations/task-comment.validation.js";
import { Router } from "express";

const router = Router();

// List/create komentar ada di #routes/task.routes.js (/tasks/:id/comments) —
// di sini cuma operasi per-komentar (delete by commentId), sama polanya kayak
// project-note.routes.js (/project-notes) vs nested notes di project.routes.js.
router.delete(
  "/:commentId",
  validate(TaskCommentDeleteValidation),
  taskCommentController.deleteComment,
);

export default router;

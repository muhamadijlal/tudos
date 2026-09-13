import projectNoteController from "#controllers/project-note.controller.js";
import validate from "#middleware/validate.middleware.js";
import {
  ProjectNoteDeleteValidation,
  ProjectNoteFindByIdValidation,
  ProjectNoteUpdateValidation,
} from "#validations/project-note.validation.js";
import { Router } from "express";

const router = Router();

router.get(
  "/:noteId",
  validate(ProjectNoteFindByIdValidation),
  projectNoteController.getNoteById,
);
router.patch(
  "/:noteId",
  validate(ProjectNoteUpdateValidation),
  projectNoteController.updateNote,
);
router.delete(
  "/:noteId",
  validate(ProjectNoteDeleteValidation),
  projectNoteController.deleteNote,
);

export default router;

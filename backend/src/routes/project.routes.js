import projectController from "#controllers/project.controller.js";
import projectNoteController from "#controllers/project-note.controller.js";
import validate from "#middleware/validate.middleware.js";
import {
  ProjectDeleteValidation,
  ProjectFindByIdValidation,
  ProjectStoreValidation,
  ProjectUpdateValidation,
} from "#validations/project.validation.js";
import {
  ProjectNoteListValidation,
  ProjectNoteStoreValidation,
} from "#validations/project-note.validation.js";
import { Router } from "express";

const router = Router();

router.get("/", projectController.getAllProjects);
router.get(
  "/:id",
  validate(ProjectFindByIdValidation),
  projectController.getProjectById,
);
router.post(
  "/",
  validate(ProjectStoreValidation),
  projectController.createProject,
);
router.put(
  "/:id",
  validate(ProjectUpdateValidation),
  projectController.updateProject,
);
router.delete(
  "/:id",
  validate(ProjectDeleteValidation),
  projectController.deleteProject,
);

// 1 project bisa punya banyak catatan — operasi per-catatan (get/update/
// delete by noteId) ada di #routes/project-note.routes.js (/project-notes).
router.get(
  "/:id/notes",
  validate(ProjectNoteListValidation),
  projectNoteController.getNotesByProject,
);
router.post(
  "/:id/notes",
  validate(ProjectNoteStoreValidation),
  projectNoteController.createNote,
);

export default router;

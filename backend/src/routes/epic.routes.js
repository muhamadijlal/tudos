import epicController from "#controllers/epic.controller.js";
import validate from "#middleware/validate.middleware.js";
import {
  EpicDeleteValidation,
  EpicFindByIdValidation,
  EpicUpdateValidation,
} from "#validations/epic.validation.js";
import { Router } from "express";

const router = Router();

// List/create per-project ada di #routes/project.routes.js (/projects/:id/epics)
// — sama pola kayak project-note. Route di sini operasi per-epic sendiri.
router.get("/:id", validate(EpicFindByIdValidation), epicController.getEpicById);
router.put("/:id", validate(EpicUpdateValidation), epicController.updateEpic);
router.delete("/:id", validate(EpicDeleteValidation), epicController.deleteEpic);

export default router;

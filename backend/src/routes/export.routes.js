import exportController from "#controllers/export.controller.js";
import validate from "#middleware/validate.middleware.js";
import { DailyActivityExportValidation } from "#validations/daily-activity-export.validation.js";
import { ExportRequestValidation } from "#validations/export.validation.js";
import { Router } from "express";

const router = Router();

router.post("/excel", validate(ExportRequestValidation), exportController.exportExcel);
router.post("/pdf", validate(ExportRequestValidation), exportController.exportPdf);
router.post(
  "/daily-activity",
  validate(DailyActivityExportValidation),
  exportController.exportDailyActivity,
);

export default router;

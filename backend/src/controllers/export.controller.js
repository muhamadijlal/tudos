import * as dailyActivityExportService from "#services/daily-activity-export.service.js";
import * as exportService from "#services/export.service.js";
import * as nationalHolidayService from "#services/national-holiday.service.js";

const exportExcel = async (req, res, next) => {
  try {
    const buffer = await exportService.buildExcelBuffer(req.body);
    const filename = exportService.sanitizeFilename(req.body.title);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
};

const exportPdf = async (req, res, next) => {
  try {
    const buffer = await exportService.buildPdfBuffer(req.body);
    const filename = exportService.sanitizeFilename(req.body.title);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

const exportDailyActivity = async (req, res, next) => {
  try {
    const holidays = await nationalHolidayService.findAll();
    const buffer = await dailyActivityExportService.buildDailyActivityWorkbook({
      tasks: req.body.tasks,
      profile: req.body.profile,
      holidays,
    });
    const filename = exportService.sanitizeFilename(`Daily Activity - ${req.body.profile.fullName}`);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
};

export default { exportExcel, exportPdf, exportDailyActivity };

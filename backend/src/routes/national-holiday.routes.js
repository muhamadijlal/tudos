import nationalHolidayController from "#controllers/national-holiday.controller.js";
import { can } from "#middleware/authorize.middleware.js";
import validate from "#middleware/validate.middleware.js";
import {
  NationalHolidayDeleteValidation,
  NationalHolidaySyncValidation,
  NationalHolidayStoreValidation,
  NationalHolidayUpdateValidation,
} from "#validations/national-holiday.validation.js";
import { Router } from "express";

const router = Router();

// Beda dari category.routes.js (GET dibuka buat semua user karena kepake di
// form task) — kalender libur cuma kepake di halaman kelolanya sendiri &
// diakses langsung dari DB pas proses export Daily Activity, jadi seluruh
// route ini digembok permission holidays.*. GET pakai holidays.view (biar
// bisa ada role yang cuma boleh lihat), mutasi (create/update/delete/sync)
// pakai holidays.manage — sama pola kayak roles.view vs roles.manage.
router.get("/", can("holidays.view"), nationalHolidayController.getAllHolidays);
router.post(
  "/",
  can("holidays.manage"),
  validate(NationalHolidayStoreValidation),
  nationalHolidayController.createHoliday,
);
router.post(
  "/sync",
  can("holidays.manage"),
  validate(NationalHolidaySyncValidation),
  nationalHolidayController.syncHolidays,
);
router.put(
  "/:id",
  can("holidays.manage"),
  validate(NationalHolidayUpdateValidation),
  nationalHolidayController.updateHoliday,
);
router.delete(
  "/:id",
  can("holidays.manage"),
  validate(NationalHolidayDeleteValidation),
  nationalHolidayController.deleteHoliday,
);

export default router;

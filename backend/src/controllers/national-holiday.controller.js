import {
  nationalHolidayCollection,
  nationalHolidayResource,
} from "#resources/national-holiday.resource.js";
import * as nationalHolidayService from "#services/national-holiday.service.js";

// String "yyyy-mm-dd" -> Date UTC-midnight, biar konsisten sama
// national-holiday.resource.js#toDateStr (dan gak geser tanggal akibat
// timezone lokal proses Node).
function toUtcDate(dateStr) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

const getAllHolidays = async (req, res, next) => {
  try {
    const holidays = await nationalHolidayService.findAll();

    res.status(200).json({
      success: true,
      data: nationalHolidayCollection(holidays),
      message: "National holidays retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const createHoliday = async (req, res, next) => {
  try {
    const holiday = await nationalHolidayService.create({
      date: toUtcDate(req.body.date),
      name: req.body.name,
    });

    res.status(201).json({
      success: true,
      data: nationalHolidayResource(holiday),
      message: "National holiday created successfully",
    });
  } catch (err) {
    next(err);
  }
};

const updateHoliday = async (req, res, next) => {
  try {
    const holidayId = Number(req.params.id);
    const holiday = await nationalHolidayService.update(holidayId, {
      date: toUtcDate(req.body.date),
      name: req.body.name,
    });

    res.status(200).json({
      success: true,
      data: nationalHolidayResource(holiday),
      message: "National holiday updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

const deleteHoliday = async (req, res, next) => {
  try {
    const holidayId = Number(req.params.id);
    await nationalHolidayService.remove(holidayId);

    res.status(200).json({
      success: true,
      message: "National holiday deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

const syncHolidays = async (req, res, next) => {
  try {
    const summary = await nationalHolidayService.syncFromYear(req.body.year);

    res.status(200).json({
      success: true,
      data: summary,
      message: "National holidays synced successfully",
    });
  } catch (err) {
    next(err);
  }
};

export default { getAllHolidays, createHoliday, updateHoliday, deleteHoliday, syncHolidays };

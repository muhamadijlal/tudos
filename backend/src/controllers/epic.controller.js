import {
  epicCollection,
  epicDetailResource,
  epicResource,
} from "#resources/epic.resource.js";
import * as epicService from "#services/epic.service.js";

const getEpicsByProject = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const epics = await epicService.findAllByProject(projectId);

    res.status(200).json({
      success: true,
      data: epicCollection(epics),
      message: "Epics retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getEpicById = async (req, res, next) => {
  try {
    const epicId = Number(req.params.id);
    const epic = await epicService.findById(epicId);

    res.status(200).json({
      success: true,
      data: epicDetailResource(epic),
      message: "Epic retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const createEpic = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const epic = await epicService.create(projectId, req.user.id, req.body);

    res.status(201).json({
      success: true,
      data: epicResource(epic),
      message: "Epic created successfully",
    });
  } catch (err) {
    next(err);
  }
};

const updateEpic = async (req, res, next) => {
  try {
    const epicId = Number(req.params.id);
    const epic = await epicService.update(epicId, req.user.id, req.body);

    res.status(200).json({
      success: true,
      data: epicResource(epic),
      message: "Epic updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

const deleteEpic = async (req, res, next) => {
  try {
    const epicId = Number(req.params.id);
    await epicService.remove(epicId, req.user.id);

    res.status(200).json({
      success: true,
      message: "Epic deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getEpicsByProject,
  getEpicById,
  createEpic,
  updateEpic,
  deleteEpic,
};

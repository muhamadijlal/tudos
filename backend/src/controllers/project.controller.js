import {
  projectCollection,
  projectResource,
} from "#resources/project.resource.js";
import * as projectService from "#services/project.service.js";

const getAllProjects = async (req, res, next) => {
  try {
    const assigneeId = req.user.permissions.includes("projects.viewAll")
      ? undefined
      : req.user.id;
    const projects = await projectService.findAll({ assigneeId });

    res.status(200).json({
      success: true,
      data: projectCollection(projects),
      message: "Projects retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const assigneeId = req.user.permissions.includes("projects.viewAll")
      ? undefined
      : req.user.id;
    const project = await projectService.findById(projectId, { assigneeId });

    res.status(200).json({
      success: true,
      data: projectResource(project),
      message: "Project retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const createProject = async (req, res, next) => {
  try {
    const newProject = await projectService.create(req.body);

    res.status(201).json({
      success: true,
      data: projectResource(newProject),
      message: "Project created successfully",
    });
  } catch (err) {
    next(err);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const updateProject = await projectService.update(projectId, req.user.id, req.body);

    res.status(200).json({
      success: true,
      data: projectResource(updateProject),
      message: "Project updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    await projectService.remove(projectId, req.user.id);

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};

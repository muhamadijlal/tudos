import { taskStatusHistoryCollection } from "#resources/task-status-history.resource.js";
import { taskCollection, taskResource } from "#resources/task.resource.js";
import * as taskService from "#services/task.service.js";
import ApiError from "#utils/ApiError.js";
import path from "path";

const getAllTasks = async (req, res, next) => {
  try {
    const assigneeId = req.user.permissions.includes("tasks.viewAll") ? undefined : req.user.id;
    const tasks = await taskService.findAll({ assigneeId });

    res.status(200).json({
      success: true,
      data: taskCollection(tasks),
      message: "Tasks retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getPendingReviewTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.findPendingReview(req.user.id);

    res.status(200).json({
      success: true,
      data: taskCollection(tasks),
      message: "Pending review tasks retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getStatusHistory = async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const assigneeId = req.user.permissions.includes("tasks.viewAll") ? undefined : req.user.id;
    await taskService.findById(taskId, { assigneeId }); // 404/403-lewat-404 kalau task gak kelihatan
    const history = await taskService.listStatusHistory(taskId);

    res.status(200).json({
      success: true,
      data: taskStatusHistoryCollection(history),
      message: "Status history retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const assigneeId = req.user.permissions.includes("tasks.viewAll") ? undefined : req.user.id;
    const task = await taskService.findById(taskId, { assigneeId });

    res.status(200).json({
      success: true,
      data: taskResource(task),
      message: "Task retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const createTask = async (req, res, next) => {
  try {
    const newTask = await taskService.create(req.body, req.files, req.user);

    res.status(201).json({
      success: true,
      data: taskResource(newTask),
      message: "Task created successfully",
    });
  } catch (err) {
    next(err);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const updatedTask = await taskService.update(taskId, req.body, req.files, req.user);

    res.status(200).json({
      success: true,
      data: taskResource(updatedTask),
      message: "Task updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    await taskService.remove(taskId);

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

const removeAttachment = async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const attachmentId = Number(req.params.attachmentId);
    await taskService.removeAttachment(taskId, attachmentId);

    res.status(200).json({
      success: true,
      message: "Attachment deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

const downloadAttachment = async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const attachmentId = Number(req.params.attachmentId);
    const task = await taskService.findById(taskId);
    const attachment = task.attachments.find((a) => a.id === attachmentId);

    if (!attachment) {
      throw new ApiError(404, "Lampiran tidak ditemukan");
    }

    const absolutePath = path.join(process.cwd(), attachment.path);
    res.download(absolutePath, attachment.name || path.basename(attachment.path), (err) => {
      if (err && !res.headersSent) next(new ApiError(404, "File lampiran tidak ditemukan"));
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getAllTasks,
  getPendingReviewTasks,
  getTaskById,
  getStatusHistory,
  createTask,
  updateTask,
  deleteTask,
  removeAttachment,
  downloadAttachment,
};

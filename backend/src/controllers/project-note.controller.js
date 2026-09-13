import {
  projectNoteCollection,
  projectNoteResource,
} from "#resources/project-note.resource.js";
import * as projectNoteService from "#services/project-note.service.js";

const getNotesByProject = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const notes = await projectNoteService.findAllByProject(projectId);

    res.status(200).json({
      success: true,
      data: projectNoteCollection(notes),
      message: "Notes retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getNoteById = async (req, res, next) => {
  try {
    const noteId = Number(req.params.noteId);
    const note = await projectNoteService.findById(noteId);

    res.status(200).json({
      success: true,
      data: projectNoteResource(note),
      message: "Note retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const createNote = async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const note = await projectNoteService.create(projectId, req.user.id, req.body);

    res.status(201).json({
      success: true,
      data: projectNoteResource(note),
      message: "Note created successfully",
    });
  } catch (err) {
    next(err);
  }
};

const updateNote = async (req, res, next) => {
  try {
    const noteId = Number(req.params.noteId);
    const note = await projectNoteService.update(noteId, req.user.id, req.body);

    res.status(200).json({
      success: true,
      data: projectNoteResource(note),
      message: "Note updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

const deleteNote = async (req, res, next) => {
  try {
    const noteId = Number(req.params.noteId);
    await projectNoteService.remove(noteId, req.user.id);

    res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getNotesByProject,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
};

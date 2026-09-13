import { taskCommentCollection, taskCommentResource } from "#resources/task-comment.resource.js";
import * as taskCommentService from "#services/task-comment.service.js";
import * as taskService from "#services/task.service.js";
import ApiError from "#utils/ApiError.js";

// Task harus kelihatan buat requester ini dulu (pakai rule yang sama kayak
// GET /tasks/:id) sebelum komentarnya boleh diakses/ditambah. Balikin task-nya
// (bukan cuma void) soalnya createComment butuh status-nya buat ngecek
// apakah komentar udah dikunci (task Done).
async function assertTaskVisible(taskId, req) {
  const assigneeId = req.user.permissions.includes("tasks.viewAll") ? undefined : req.user.id;
  return taskService.findById(taskId, { assigneeId });
}

const getComments = async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    await assertTaskVisible(taskId, req);
    const comments = await taskCommentService.findAllByTask(taskId);

    res.status(200).json({
      success: true,
      data: taskCommentCollection(comments),
      message: "Comments retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const createComment = async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const task = await assertTaskVisible(taskId, req);
    if (task.status === "done") {
      throw new ApiError(403, "Task ini sudah Done, gak bisa dikomentari lagi");
    }
    const comment = await taskCommentService.create(task, req.user, req.body.content, req.body.parentId);

    res.status(201).json({
      success: true,
      data: taskCommentResource(comment),
      message: "Comment created successfully",
    });
  } catch (err) {
    next(err);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const commentId = Number(req.params.commentId);
    await taskCommentService.remove(commentId, req.user.id);

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export default { getComments, createComment, deleteComment };

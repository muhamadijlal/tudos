// User cuma {id, name} doang (bukan userResource yang berat/recursive) —
// cukup buat nampilin "siapa yang komentar".
const taskCommentResource = (comment) => ({
  id: comment.id,
  taskId: comment.taskId,
  parentId: comment.parentId ?? null,
  content: comment.content,
  user: comment.user ? { id: comment.user.id, name: comment.user.name } : null,
  createdAt: comment.createdAt,
});

const taskCommentCollection = (comments) => comments.map(taskCommentResource);

export { taskCommentCollection, taskCommentResource };

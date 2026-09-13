import authenticate from "#middleware/authenticate.middleware.js";
import authRoutes from "#routes/auth.routes.js";
import categoryRoutes from "#routes/category.routes.js";
import epicRoutes from "#routes/epic.routes.js";
import exportRoutes from "#routes/export.routes.js";
import nationalHolidayRoutes from "#routes/national-holiday.routes.js";
import notificationRoutes from "#routes/notification.routes.js";
import profilePictureRoutes from "#routes/profile-picture.routes.js";
import projectNoteRoutes from "#routes/project-note.routes.js";
import projectRoutes from "#routes/project.routes.js";
import roleRoutes from "#routes/role.routes.js";
import taskCommentRoutes from "#routes/task-comment.routes.js";
import taskRoutes from "#routes/task.routes.js";
import userRoutes from "#routes/user.routes.js";
import { Router } from "express";

const router = Router();

router.use("/users", authenticate, userRoutes);
// Publik (gak lewat authenticate) — <img src> gak bisa nempelin header
// Authorization, lihat komentar di profile-picture.routes.js.
router.use("/profile-pictures", profilePictureRoutes);
router.use("/projects", authenticate, projectRoutes);
router.use("/project-notes", authenticate, projectNoteRoutes);
router.use("/epics", authenticate, epicRoutes);
router.use("/tasks", authenticate, taskRoutes);
router.use("/task-comments", authenticate, taskCommentRoutes);
router.use("/categories", authenticate, categoryRoutes);
router.use("/national-holidays", authenticate, nationalHolidayRoutes);
router.use("/roles", authenticate, roleRoutes);
router.use("/notifications", authenticate, notificationRoutes);
router.use("/exports", authenticate, exportRoutes);
router.use("/auth", authRoutes);

export default router;

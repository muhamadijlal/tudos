import notificationController from "#controllers/notification.controller.js";
import validate from "#middleware/validate.middleware.js";
import { NotificationIdParamValidation } from "#validations/notification.validation.js";
import { Router } from "express";

const router = Router();

router.get("/", notificationController.getNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch(
  "/:id/read",
  validate(NotificationIdParamValidation),
  notificationController.markRead,
);
router.patch(
  "/:id/unread",
  validate(NotificationIdParamValidation),
  notificationController.markUnread,
);
router.patch("/read-all", notificationController.markAllRead);
router.delete(
  "/:id",
  validate(NotificationIdParamValidation),
  notificationController.deleteNotification,
);

export default router;

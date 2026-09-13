import { notificationCollection } from "#resources/notification.resource.js";
import * as notificationService from "#services/notification.service.js";

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.findRecentForUser(req.user.id);

    res.status(200).json({
      success: true,
      data: notificationCollection(notifications),
      message: "Notifications retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.countUnreadForUser(req.user.id);

    res.status(200).json({
      success: true,
      data: { count },
      message: "Unread count retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    const notificationId = Number(req.params.id);
    await notificationService.markRead(notificationId, req.user.id);

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await notificationService.markAllRead(req.user.id);

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (err) {
    next(err);
  }
};

const markUnread = async (req, res, next) => {
  try {
    const notificationId = Number(req.params.id);
    await notificationService.markUnread(notificationId, req.user.id);

    res.status(200).json({
      success: true,
      message: "Notification marked as unread",
    });
  } catch (err) {
    next(err);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const notificationId = Number(req.params.id);
    await notificationService.remove(notificationId, req.user.id);

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  markUnread,
  deleteNotification,
};

import { userCollection, userResource } from "#resources/user.resource.js";
import * as userService from "#services/user.service.js";
import ApiError from "#utils/ApiError.js";
import path from "path";

const getAssignableUsers = async (req, res, next) => {
  try {
    const users = await userService.findAllMinimal();

    res.status(200).json({
      success: true,
      data: users,
      message: "Assignable users retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.findAll();

    res.status(200).json({
      success: true,
      data: userCollection(users),
      message: "Users retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const user = await userService.findById(userId);

    res.status(200).json({
      success: true,
      data: userResource(user),
      message: "User retrieved successfully",
    });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const updatedUser = await userService.update(userId, req.body);

    res.status(200).json({
      success: true,
      data: userResource(updatedUser),
      message: "User updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

const updateUserPassword = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    await userService.updatePassword(userId, req.user, req.body);

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const updatedUser = await userService.updateRole(userId, req.body.roleId);

    res.status(200).json({
      success: true,
      data: userResource(updatedUser),
      message: "User role updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

const uploadProfilePicture = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const updatedUser = await userService.updateProfilePicture(userId, req.file.buffer);

    res.status(200).json({
      success: true,
      data: userResource(updatedUser),
      message: "Profile picture updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

const deleteProfilePicture = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const updatedUser = await userService.removeProfilePicture(userId);

    res.status(200).json({
      success: true,
      data: userResource(updatedUser),
      message: "Profile picture removed successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getProfilePicture = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const user = await userService.findById(userId);

    if (!user.profilePicture) {
      throw new ApiError(404, "User belum punya foto profil");
    }

    const absolutePath = path.join(process.cwd(), user.profilePicture);
    res.sendFile(absolutePath, (err) => {
      if (err && !res.headersSent) next(new ApiError(404, "File foto profil tidak ditemukan"));
    });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    await userService.remove(userId);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getAssignableUsers,
  getAllUsers,
  getUserById,
  updateUser,
  updateUserPassword,
  updateUserRole,
  uploadProfilePicture,
  deleteProfilePicture,
  getProfilePicture,
  deleteUser,
};

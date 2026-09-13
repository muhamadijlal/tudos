import userController from "#controllers/user.controller.js";
import { authorizeSelfOr, can } from "#middleware/authorize.middleware.js";
import uploadProfilePicture from "#middleware/upload-profile-picture.middleware.js";
import validate from "#middleware/validate.middleware.js";
import {
  UserDeleteValidation,
  UserFindByIdValidation,
  UserPasswordUpdateValidation,
  UserRoleUpdateValidation,
  UserUpdateValidation,
} from "#validations/user.validation.js";
import { Router } from "express";

const router = Router();

// Harus di atas "/:id" — kalau enggak, Express bakal nangkep "/assignable"
// sebagai :id duluan.
router.get("/assignable", userController.getAssignableUsers);
router.get("/", can("users.view"), userController.getAllUsers);
router.get(
  "/:id",
  validate(UserFindByIdValidation),
  userController.getUserById,
);
router.put(
  "/:id",
  authorizeSelfOr("users.update"),
  validate(UserUpdateValidation),
  userController.updateUser,
);
router.patch(
  "/:id/password",
  authorizeSelfOr("users.update"),
  validate(UserPasswordUpdateValidation),
  userController.updateUserPassword,
);
router.post(
  "/:id/profile-picture",
  authorizeSelfOr("users.update"),
  validate(UserFindByIdValidation),
  uploadProfilePicture,
  userController.uploadProfilePicture,
);
router.delete(
  "/:id/profile-picture",
  authorizeSelfOr("users.update"),
  validate(UserFindByIdValidation),
  userController.deleteProfilePicture,
);
router.patch(
  "/:id/role",
  can("users.assignRole"),
  validate(UserRoleUpdateValidation),
  userController.updateUserRole,
);
router.delete(
  "/:id",
  can("users.delete"),
  validate(UserDeleteValidation),
  userController.deleteUser,
);

export default router;

import roleController from "#controllers/role.controller.js";
import { can } from "#middleware/authorize.middleware.js";
import validate from "#middleware/validate.middleware.js";
import {
  RoleDeleteValidation,
  RoleFindByIdValidation,
  RoleStoreValidation,
  RoleUpdateValidation,
} from "#validations/role.validation.js";
import { Router } from "express";

const router = Router();

router.get("/permissions", can("roles.view"), roleController.getPermissions);
router.get("/", can("roles.view"), roleController.getAllRoles);
router.get(
  "/:id",
  can("roles.view"),
  validate(RoleFindByIdValidation),
  roleController.getRoleById,
);
router.post(
  "/",
  can("roles.manage"),
  validate(RoleStoreValidation),
  roleController.createRole,
);
router.put(
  "/:id",
  can("roles.manage"),
  validate(RoleUpdateValidation),
  roleController.updateRole,
);
router.delete(
  "/:id",
  can("roles.manage"),
  validate(RoleDeleteValidation),
  roleController.deleteRole,
);

export default router;

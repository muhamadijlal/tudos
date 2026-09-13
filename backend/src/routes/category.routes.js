import categoryController from "#controllers/category.controller.js";
import { can } from "#middleware/authorize.middleware.js";
import validate from "#middleware/validate.middleware.js";
import {
  CategoryDeleteValidation,
  CategoryStoreValidation,
  CategoryUpdateValidation,
} from "#validations/category.validation.js";
import { Router } from "express";

const router = Router();

router.get("/", categoryController.getAllCategories);
router.post(
  "/",
  can("categories.manage"),
  validate(CategoryStoreValidation),
  categoryController.createCategory,
);
router.put(
  "/:id",
  can("categories.manage"),
  validate(CategoryUpdateValidation),
  categoryController.updateCategory,
);
router.delete(
  "/:id",
  can("categories.manage"),
  validate(CategoryDeleteValidation),
  categoryController.deleteCategory,
);

export default router;

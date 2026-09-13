import * as authController from "#controllers/auth.controller.js";
import authenticate from "#middleware/authenticate.middleware.js";
import validate from "#middleware/validate.middleware.js";
import {
  LoginValidation,
  RefreshTokenValidation,
  RegisterValidation,
} from "#validations/auth.validation.js";
import { Router } from "express";

const router = Router();

router.post("/register", validate(RegisterValidation), authController.register);
router.post("/login", validate(LoginValidation), authController.login);
router.post(
  "/refresh",
  validate(RefreshTokenValidation),
  authController.refresh,
);
router.post("/logout", validate(RefreshTokenValidation), authController.logout);
router.get("/me", authenticate, authController.me);

export default router;

import express, { Router } from "express";

import { forgetPassword, login, resetPassword, signUp } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
} from "../schemas/auth.schema.js";

const router: Router = express.Router();

router.route("/signup").post(validate(signUpSchema), signUp);
router.route("/login").post(validate(loginSchema), login);
router.route("/forget-password").post(validate(forgotPasswordSchema), forgetPassword);
router.route("/reset-password/:token").patch(validate(resetPasswordSchema), resetPassword);

export default router;

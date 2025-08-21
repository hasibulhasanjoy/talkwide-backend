import express, { Router } from "express";

import { forgetPassword, login, signUp } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { forgotPasswordSchema, loginSchema, signUpSchema } from "../schemas/auth.schema.js";

const router: Router = express.Router();

router.route("/signup").post(validate(signUpSchema), signUp);
router.route("/login").post(validate(loginSchema), login);
router.route("/forget-password").post(validate(forgotPasswordSchema), forgetPassword);

export default router;

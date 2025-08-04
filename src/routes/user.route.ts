import express, { Router } from "express";

import { login, signUp } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { loginSchema, signUpSchema } from "../schemas/auth.schema.js";

const router: Router = express.Router();

router.route("/signup").post(validate(signUpSchema), signUp);
router.route("/login").post(validate(loginSchema), login);

export default router;

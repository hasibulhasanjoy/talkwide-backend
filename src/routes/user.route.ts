import express, { Router } from "express";

import { signUp } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { signUpSchema } from "../schemas/auth.schema.js";

const router: Router = express.Router();

router.route("/signup").post(validate(signUpSchema), signUp);

export default router;

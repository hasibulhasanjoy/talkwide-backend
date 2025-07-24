import express, { Router } from "express";

import { signUp } from "../controllers/auth.controller.js";

const router: Router = express.Router();

router.route("/signup").post(signUp);

export default router;

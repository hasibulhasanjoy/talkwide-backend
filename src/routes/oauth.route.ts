import express, { RequestHandler, Router } from "express";
import passport from "passport";

import {
  googleAuthCallback,
  googleAuthFailure,
  googleTokenAuth,
} from "../controllers/oauth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { googleAuthSchema } from "../schemas/auth.schema.js";

const router: Router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }) as RequestHandler
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/api/auth/google/failure",
    session: false,
  }) as RequestHandler,
  googleAuthCallback
);

router.get("/google/failure", googleAuthFailure);

router.post("/google/token", validate(googleAuthSchema), googleTokenAuth);

export default router;

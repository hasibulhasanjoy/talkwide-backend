import express, { Router } from "express";

import {
  changePassword,
  forgotPassword,
  login,
  resetPassword,
  signUp,
} from "../controllers/auth.controller.js";
import {
  getDownvotedPosts,
  getSavedPosts,
  getUpvotedPosts,
  getUserPosts,
} from "../controllers/post.controller.js";
import {
  getProfile,
  getUserProfile,
  updateProfile,
} from "../controllers/user.controller.js";
import { authenticateUser, optionalAuthenticateUser } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
} from "../schemas/auth.schema.js";
import { updateProfileSchema } from "../schemas/user.schema.js";

const router: Router = express.Router();

router.route("/signup").post(validate(signUpSchema), signUp);
router.route("/login").post(validate(loginSchema), login);
router.route("/forget-password").post(validate(forgotPasswordSchema), forgotPassword);
router.route("/reset-password/:token").patch(validate(resetPasswordSchema), resetPassword);
router
  .route("/change-password")
  .patch(authenticateUser, validate(changePasswordSchema), changePassword);

router.route("/me/profile").get(authenticateUser, getProfile);
router
  .route("/me/profile")
  .patch(authenticateUser, validate(updateProfileSchema), updateProfile);
router.route("/me/saved").get(authenticateUser, getSavedPosts);
router.route("/me/upvoted").get(authenticateUser, getUpvotedPosts);
router.route("/me/downvoted").get(authenticateUser, getDownvotedPosts);
router.route("/:username").get(optionalAuthenticateUser, getUserProfile);
router.route("/:username/posts").get(optionalAuthenticateUser, getUserPosts);

export default router;
import express, { Router } from "express";

import {
  createPost,
  deletePost,
  getAllPosts,
  getPostById,
  savePost,
  updatePost,
  votePost,
} from "../controllers/post.controller.js";
import { authenticateUser, optionalAuthenticateUser } from "../middlewares/auth.middleware.js";
import { uploadPostImage } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createPostSchema, updatePostSchema, voteSchema } from "../schemas/post.schema.js";

const router: Router = express.Router();

router
  .route("/")
  .post(authenticateUser, uploadPostImage.single("image"), validate(createPostSchema), createPost)
  .get(optionalAuthenticateUser, getAllPosts);

router
  .route("/:id")
  .get(optionalAuthenticateUser, getPostById)
  .patch(authenticateUser, validate(updatePostSchema), updatePost)
  .delete(authenticateUser, deletePost);

router.route("/:id/vote").post(authenticateUser, validate(voteSchema), votePost);
router.route("/:id/save").post(authenticateUser, savePost);

export default router;

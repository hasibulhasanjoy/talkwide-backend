import express, { Router } from "express";

import { createComment, getPostComments } from "../controllers/comment.controller.js";
import {
  createPost,
  deletePost,
  getAllPosts,
  getPostById,
  lockPostComments,
  savePost,
  updatePost,
  votePost,
} from "../controllers/post.controller.js";
import { authenticateUser, optionalAuthenticateUser } from "../middlewares/auth.middleware.js";
import { uploadPostImage } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createCommentSchema } from "../schemas/comment.schema.js";
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

// Turn comments on/off for a post (post author only).
router.route("/:id/lock").patch(authenticateUser, lockPostComments);

// Top-level comments for a post: create one, or list the sorted comment tree.
router
  .route("/:postId/comments")
  .post(authenticateUser, validate(createCommentSchema), createComment)
  .get(optionalAuthenticateUser, getPostComments);

export default router;

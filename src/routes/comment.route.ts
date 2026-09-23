import express, { Router } from "express";

import {
  createComment,
  deleteComment,
  getPostComments,
  pinComment,
  replyToComment,
  updateComment,
  voteComment,
} from "../controllers/comment.controller.js";
import { authenticateUser, optionalAuthenticateUser } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createCommentSchema, updateCommentSchema } from "../schemas/comment.schema.js";
import { voteSchema } from "../schemas/post.schema.js";

const router: Router = express.Router();

// Create a top-level comment on a post. POST /api/posts/:postId/comments
router
  .route("/:postId/comments")
  .post(authenticateUser, validate(createCommentSchema), createComment)
  .get(optionalAuthenticateUser, getPostComments);

// Reply to an existing comment (creates a nested reply).
router.route("/:id/replies").post(authenticateUser, validate(createCommentSchema), replyToComment);

// Vote on a comment: upvote / downvote / remove.
router.route("/:id/vote").post(authenticateUser, validate(voteSchema), voteComment);

// Pin / unpin a comment (post author only).
router.route("/:id/pin").patch(authenticateUser, pinComment);

// Update (author only) or delete (author or moderator/admin) a comment.
router
  .route("/:id")
  .patch(authenticateUser, validate(updateCommentSchema), updateComment)
  .delete(authenticateUser, deleteComment);

export default router;

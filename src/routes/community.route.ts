import express, { Router } from "express";

import {
  appointRole,
  ban,
  create,
  demoteRole,
  getById,
  join,
  leave,
  listMembers,
  listPosts,
  remove,
  removePost,
  unban,
  update,
} from "../controllers/community.controller.js";
import { authenticateUser, optionalAuthenticateUser } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createCommunitySchema,
  manageMemberSchema,
  updateCommunitySchema,
  updateMemberRoleSchema,
} from "../schemas/community.schema.js";

const router: Router = express.Router();

// Community CRUD
router.route("/").post(authenticateUser, validate(createCommunitySchema), create);

router
  .route("/:id")
  .get(getById)
  .patch(authenticateUser, validate(updateCommunitySchema), update)
  .delete(authenticateUser, remove);

// Membership
router.route("/:id/join").post(authenticateUser, join);
router.route("/:id/leave").post(authenticateUser, leave);
router.route("/:id/members").get(listMembers);

// Community posts
router.route("/:id/posts").get(optionalAuthenticateUser, listPosts);

// Role management (appoint / demote)
router
  .route("/:id/roles")
  .post(authenticateUser, validate(updateMemberRoleSchema), appointRole)
  .delete(authenticateUser, validate(manageMemberSchema), demoteRole);

// Moderation
router.route("/:id/ban").post(authenticateUser, validate(manageMemberSchema), ban);
router.route("/:id/unban").post(authenticateUser, validate(manageMemberSchema), unban);
router.route("/:id/posts/:postId").delete(authenticateUser, removePost);

export default router;

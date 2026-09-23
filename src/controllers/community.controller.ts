import { NextFunction, Request, Response } from "express";

import {
  CreateCommunityData,
  ManageMemberData,
  UpdateCommunityData,
  UpdateMemberRoleData,
} from "../schemas/community.schema.js";
import {
  banUser,
  createCommunity,
  deleteCommunity,
  deletePostFromCommunity,
  getCommunityById,
  getCommunityMembers,
  getCommunityPosts,
  joinCommunity,
  leaveCommunity,
  removeMemberRole,
  unbanUser,
  updateCommunity,
  updateMemberRole,
} from "../services/community.service.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.utils.js";

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export const create = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const { name, description } = req.body as CreateCommunityData;
    const userId = req.user!._id;

    const community = await createCommunity(name, description, userId);

    res.status(201).json({
      status: "success",
      data: { community },
    });
  }
);

export const getById = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const community = await getCommunityById(req.params.id as string);

    res.status(200).json({
      status: "success",
      data: { community },
    });
  }
);

export const update = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const { name, description } = req.body as UpdateCommunityData;
    const userId = req.user!._id;

    const community = await updateCommunity(req.params.id as string, userId, { name, description });

    res.status(200).json({
      status: "success",
      data: { community },
    });
  }
);

export const remove = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    await deleteCommunity(req.params.id as string, req.user!._id);

    res.status(200).json({
      status: "success",
      message: "Community deleted successfully",
    });
  }
);

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export const join = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const community = await joinCommunity(req.params.id as string, req.user!._id);

    res.status(200).json({
      status: "success",
      data: { memberCount: community.memberCount },
    });
  }
);

export const leave = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    await leaveCommunity(req.params.id as string, req.user!._id);

    res.status(200).json({
      status: "success",
      message: "You have left the community",
    });
  }
);

export const listMembers = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const role = req.query.role as string | undefined;

    const result = await getCommunityMembers(req.params.id as string, {
      page,
      limit,
      role: role as "member" | "moderator" | "admin" | "owner" | undefined,
    });

    res.status(200).json({
      status: "success",
      data: result,
    });
  }
);

// ---------------------------------------------------------------------------
// Community posts
// ---------------------------------------------------------------------------

export const listPosts = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const sort = (req.query.sort as string) || "new";

    const result = await getCommunityPosts(
      req.params.id as string,
      { page, limit, sort: sort as "new" | "top" | "hot" },
      req.user?._id
    );

    res.status(200).json({
      status: "success",
      data: result,
    });
  }
);

// ---------------------------------------------------------------------------
// Role management
// ---------------------------------------------------------------------------

export const appointRole = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const { userId, role } = req.body as UpdateMemberRoleData;
    const actorId = req.user!._id;

    const community = await updateMemberRole(req.params.id as string, actorId, userId, role);

    res.status(200).json({
      status: "success",
      data: { community },
    });
  }
);

export const demoteRole = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const { userId } = req.body as ManageMemberData;
    const actorId = req.user!._id;

    const community = await removeMemberRole(req.params.id as string, actorId, userId);

    res.status(200).json({
      status: "success",
      data: { community },
    });
  }
);

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

export const ban = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const { userId } = req.body as ManageMemberData;

    await banUser(req.params.id as string, req.user!._id, userId);

    res.status(200).json({
      status: "success",
      message: "User banned from the community",
    });
  }
);

export const unban = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const { userId } = req.body as ManageMemberData;

    await unbanUser(req.params.id as string, req.user!._id, userId);

    res.status(200).json({
      status: "success",
      message: "User unbanned from the community",
    });
  }
);

export const removePost = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    await deletePostFromCommunity(
      req.params.id as string,
      req.params.postId as string,
      req.user!._id
    );

    res.status(200).json({
      status: "success",
      message: "Post removed from community",
    });
  }
);

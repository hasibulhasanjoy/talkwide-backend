import { NextFunction, Request, Response } from "express";

import IUser from "../interfaces/user.interface.js";
import User from "../models/user.model.js";
import AppError from "../utils/appError.class.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.utils.js";

export const getProfile = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const currentUser = req.user as IUser;

    const user = (await User.findById(currentUser._id).select(
      "-password -googleId -upvotedPosts -downVotedPosts -upvotedComments -downVotedComments"
    )) as IUser | null;

    if (!user) {
      throw new AppError("user not found", 404);
    }

    res.status(200).json({
      status: "success",
      data: {
        user: {
          _id: user._id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          emailVerifiedAt: user.emailVerifiedAt,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          role: user.role,
          karma: user.karma,
          authProvider: user.authProvider,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  }
);

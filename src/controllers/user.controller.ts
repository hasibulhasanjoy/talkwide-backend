import { NextFunction, Request, Response } from "express";

import IUser from "../interfaces/user.interface.js";
import User from "../models/user.model.js";
import { UpdateProfileData } from "../schemas/user.schema.js";
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

export const getUserProfile = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const { username } = req.params;

    const user = (await User.findOne({ username }).select(
      "-password -googleId -upvotedPosts -downVotedPosts -upvotedComments -downVotedComments"
    )) as IUser | null;

    if (!user) {
      throw new AppError("user not found", 404);
    }

    const publicProfile = {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      karma: user.karma,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
    };

    const responseData: Record<string, unknown> = { user: publicProfile };

    // Include relationship info if the requester is authenticated
    if (req.user) {
      responseData.isOwnProfile = user._id.equals(req.user._id);
    }

    res.status(200).json({
      status: "success",
      data: responseData,
    });
  }
);

export const updateProfile = asyncErrorHandler(
  async (
    req: Request<unknown, unknown, UpdateProfileData>,
    res: Response,
    _next: NextFunction
  ): Promise<void | Response> => {
    const currentUser = req.user as IUser;
    const updateData: Partial<UpdateProfileData> = req.body;

    // Check if username is being updated and if it's already taken
    if (updateData.username && updateData.username !== currentUser.username) {
      const existingUser = await User.findOne({ username: updateData.username });
      if (existingUser) {
        throw new AppError("username is already taken", 409);
      }
    }

    // Build the update object with only provided fields
    const updateFields: Partial<IUser> = {};
    if (updateData.username !== undefined) {
      updateFields.username = updateData.username;
    }
    if (updateData.displayName !== undefined) {
      updateFields.displayName = updateData.displayName;
    }
    if (updateData.bio !== undefined) {
      updateFields.bio = updateData.bio || undefined;
    }
    if (updateData.avatarUrl !== undefined) {
      updateFields.avatarUrl = updateData.avatarUrl || undefined;
    }

    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select(
      "-password -googleId -upvotedPosts -downVotedPosts -upvotedComments -downVotedComments"
    );

    if (!updatedUser) {
      throw new AppError("user not found", 404);
    }

    res.status(200).json({
      status: "success",
      data: {
        user: {
          _id: updatedUser._id,
          username: updatedUser.username,
          displayName: updatedUser.displayName,
          email: updatedUser.email,
          emailVerifiedAt: updatedUser.emailVerifiedAt,
          avatarUrl: updatedUser.avatarUrl,
          bio: updatedUser.bio,
          role: updatedUser.role,
          karma: updatedUser.karma,
          authProvider: updatedUser.authProvider,
          lastLogin: updatedUser.lastLogin,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      },
    });
  }
);

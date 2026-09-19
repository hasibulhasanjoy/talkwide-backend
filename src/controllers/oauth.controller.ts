import { NextFunction, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";

import IUser from "../interfaces/user.interface.js";
import User from "../models/user.model.js";
import { GoogleAuthData } from "../schemas/auth.schema.js";
import AppError from "../utils/appError.class.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.utils.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuthCallback = (req: Request, res: Response, _next: NextFunction): void => {
  const user = req.user as IUser;

  if (!user) {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
    return;
  }

  const token = user.generateAuthToken();

  res.redirect(
    `${process.env.FRONTEND_URL}/auth/google/callback?token=${token}&username=${user.username}&displayName=${user.displayName}&email=${user.email}`
  );
};

export const googleAuthFailure = (_req: Request, res: Response, _next: NextFunction): void => {
  res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
};

export const googleTokenAuth = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { idToken } = req.body as GoogleAuthData;

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new AppError("Invalid Google token", 401);
    }

    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ googleId });

    if (user) {
      user.lastLogin = new Date();
      await user.save();

      const token = user.generateAuthToken();

      res.status(200).json({
        status: "success",
        token,
        data: {
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          avatarUrl: user.avatarUrl,
        },
      });
      return;
    }

    user = await User.findOne({ email });

    if (user) {
      if (user.authProvider === "local") {
        throw new AppError(
          "An account with this email already exists. Please login with email/password.",
          409
        );
      }

      user.googleId = googleId;
      user.lastLogin = new Date();
      await user.save();

      const token = user.generateAuthToken();

      res.status(200).json({
        status: "success",
        token,
        data: {
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          avatarUrl: user.avatarUrl,
        },
      });
      return;
    }

    const displayName = name || "User";
    const username = `user_${googleId.slice(0, 10)}`;

    const newUser: IUser = await User.create({
      username,
      displayName,
      email,
      authProvider: "google",
      googleId,
      avatarUrl: picture,
      emailVerifiedAt: new Date(),
      lastLogin: new Date(),
    });

    const token = newUser.generateAuthToken();

    res.status(201).json({
      status: "success",
      token,
      data: {
        username: newUser.username,
        displayName: newUser.displayName,
        email: newUser.email,
        avatarUrl: newUser.avatarUrl,
      },
    });
  }
);

import { NextFunction, Request, Response } from "express";

import IUser from "../interfaces/user.interface.js";
import User from "../models/user.model.js";
import { SignUpData } from "../schemas/auth.schema.js";
import AppError from "../utils/appError.class.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.utils.js";

export const signUp = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const { username, displayName, email, password } = req.body as SignUpData;

    const existingUser: IUser | null = await User.findOne({ email });

    if (existingUser) {
      throw new AppError("user already exists with this email", 400);
    }

    const newUser: IUser = await User.create({
      username,
      displayName,
      email,
      password,
    });

    const token = newUser.generateAuthToken();

    res.status(201).json({
      status: "success",
      token,
      data: {
        user: {
          username,
          displayName,
          email,
        },
      },
    });
  }
);

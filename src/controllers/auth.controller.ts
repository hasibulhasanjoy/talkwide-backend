import { NextFunction, Request, Response } from "express";

import IUser from "../interfaces/user.interface.js";
import User from "../models/user.model.js";
import AppError from "../utils/appError.class.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.utils.js";

interface signUpRequestBody {
  username: string;
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const signUp = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    if (!req.body) {
      throw new AppError("no sign up data send", 404);
    }

    const { username, displayName, email, password, confirmPassword } =
      req.body as signUpRequestBody;

    const existingUser: IUser | null = await User.findOne({ email });

    if (existingUser) {
      throw new AppError("user already exists with this email", 400);
    }

    if (password != confirmPassword) {
      throw new AppError("password didn't matched!", 400);
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

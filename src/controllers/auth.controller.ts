import { NextFunction, Request, Response } from "express";

import { IUser } from "../models/user.model.js";
import User from "../models/user.model.js";
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
    const { username, displayName, email, password, confirmPassword } =
      req.body as signUpRequestBody;

    if (password != confirmPassword) {
      return res.status(400).json({ status: "fail" });
    }

    const newUser: IUser = await User.create({
      username,
      displayName,
      email,
      password,
    });

    res.status(200).json({
      status: "success",
      data: {
        user: newUser,
      },
    });
  }
);

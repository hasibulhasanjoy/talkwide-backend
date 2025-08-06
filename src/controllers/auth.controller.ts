import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";

import IUser from "../interfaces/user.interface.js";
import User from "../models/user.model.js";
import { LoginData, SignUpData } from "../schemas/auth.schema.js";
import sendMail from "../services/mail.service.js";
import AppError from "../utils/appError.class.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.utils.js";
import { welcomeTemplate } from "../utils/emailTemplates.util.js";

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

    await sendMail({
      to: email,
      subject: "welcome to talkwide",
      body: welcomeTemplate(username),
    });

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

export const login = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const { username, email, password } = req.body as LoginData;
    const existingUser = await User.findOne({ $or: [{ username }, { email }] }).select("+password");

    if (!existingUser) {
      throw new AppError("invalid credential", 401);
    }

    const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);

    if (!isPasswordCorrect) {
      throw new AppError("invalid credential", 401);
    }

    const token = existingUser.generateAuthToken();

    res.status(200).json({
      status: "success",
      token,
      data: {
        username: existingUser.username,
        displayName: existingUser.displayName,
        email: existingUser.email,
      },
    });
  }
);

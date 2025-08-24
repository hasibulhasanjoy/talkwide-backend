import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";

import IUser from "../interfaces/user.interface.js";
import ResetToken from "../models/resetToken.model.js";
import User from "../models/user.model.js";
import {
  ChangePasswordData,
  ForgotPasswordData,
  LoginData,
  ResetPasswordData,
  SignUpData,
} from "../schemas/auth.schema.js";
import { forgotPasswordService, resetPasswordService } from "../services/auth.service.js";
import sendMail from "../services/mail.service.js";
import AppError from "../utils/appError.class.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.utils.js";
import { passwordResetTemplate, welcomeTemplate } from "../utils/emailTemplates.util.js";

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

export const forgotPassword = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const { email } = req.body as ForgotPasswordData;

    const user: IUser | null = await User.findOne({ email });

    if (!user) {
      throw new AppError("no user found with that email", 404);
    }

    const resetToken = await forgotPasswordService(user);

    if (!resetToken) {
      throw new AppError("error in getting reset token", 400);
    }

    const resetUrl = `${req.protocol}://${req.get("host")}/api/users/reset-password/${resetToken}`;

    res.status(200).json({
      status: "success",
      message: "Password reset token sent to email.",
    });

    sendMail({
      to: email,
      subject: "Reset Your Password - Token Valid for 10 Minutes",
      body: passwordResetTemplate(user.username, resetUrl),
    }).catch(async (_err) => {
      await ResetToken.deleteMany({ userId: user._id });
      console.log("Failed to send reset email. Try again later.");
    });
  }
);

export const resetPassword = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { token } = req.params;
    const { password } = req.body as ResetPasswordData;

    const jwtToken = await resetPasswordService(token, password);

    if (!jwtToken) {
      throw new AppError("password changing failed or error in getting jwt token", 400);
    }

    res.status(200).json({
      status: "success",
      token: jwtToken,
      message: "password changed successfully",
    });
  }
);

export const changePassword = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    const user: IUser = (await User.findById(req.user!.id).select("+password")) as IUser;

    const { oldPassword, newPassword } = req.body as ChangePasswordData;

    const isPasswordCorrect = await user.comparePassword(oldPassword);

    if (!isPasswordCorrect) {
      return next(new AppError("incorrect password", 401));
    }

    user.password = newPassword;
    await user.save();

    const token = user.generateAuthToken();

    res.status(200).json({
      status: "success",
      token,
      message: "password changed successfully",
    });
  }
);

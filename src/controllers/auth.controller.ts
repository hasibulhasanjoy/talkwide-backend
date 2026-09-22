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
  SendVerificationEmailData,
  SignUpData,
} from "../schemas/auth.schema.js";
import {
  forgotPasswordService,
  initiateSignupService,
  resendSignupVerificationService,
  resetPasswordService,
  verifySignupService,
} from "../services/auth.service.js";
import sendMail from "../services/mail.service.js";
import AppError from "../utils/appError.class.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.utils.js";
import {
  emailVerificationTemplate,
  passwordResetTemplate,
  welcomeTemplate,
} from "../utils/emailTemplates.util.js";

/**
 * Builds the verification URL and fires the email in the background.
 * Shared by signUp and resendVerificationEmail.
 */
const dispatchVerificationEmail = (
  recipient: { username: string; email: string },
  verificationToken: string,
  req: Request
): void => {
  const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
  const verificationUrl = `${frontendUrl}/api/users/verify-email/${verificationToken}`;

  sendMail({
    to: recipient.email,
    subject: "Verify Your Email Address",
    body: emailVerificationTemplate(recipient.username, verificationUrl),
  }).catch((_err) => {
    // Don't delete the pending signup here — the user can still hit
    // /resend-verification-email to get a fresh token for the same data.
    console.log("Failed to send verification email. User can request a new one.");
  });
};

export const signUp = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const signUpData = req.body as SignUpData;

    const existingUser: IUser | null = await User.findOne({
      $or: [{ email: signUpData.email }, { username: signUpData.username }],
    });

    if (existingUser) {
      throw new AppError("user already exists with this email or username", 400);
    }

    // Nothing is created in the User collection yet — the signup is staged
    // and only promoted to a real account once the email is verified.
    const { token, username, email } = await initiateSignupService(signUpData);

    dispatchVerificationEmail({ username, email }, token, req);

    res.status(202).json({
      status: "success",
      message: "Verification email sent. Please verify your email to complete registration.",
      data: {
        user: {
          username,
          displayName: signUpData.displayName,
          email,
        },
      },
    });
  }
);

export const verifyEmail = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const token = req.params.token as string;

    // Account is created here, for the first time, only on success
    const newUser = await verifySignupService(token);

    const jwtToken = newUser.generateAuthToken();

    await sendMail({
      to: newUser.email,
      subject: "Welcome to Talkwide!",
      body: welcomeTemplate(newUser.username),
    });

    res.status(201).json({
      status: "success",
      token: jwtToken,
      message: "Email verified successfully. Welcome to Talkwide!",
      data: {
        user: {
          username: newUser.username,
          displayName: newUser.displayName,
          email: newUser.email,
          emailVerifiedAt: newUser.emailVerifiedAt,
        },
      },
    });
  }
);

export const resendVerificationEmail = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const { email } = req.body as SendVerificationEmailData;

    const { token, username } = await resendSignupVerificationService(email);

    dispatchVerificationEmail({ username, email }, token, req);

    res.status(200).json({
      status: "success",
      message: "Verification email sent. Please check your inbox.",
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

    existingUser.lastLogin = new Date();
    await existingUser.save({ validateBeforeSave: false });

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
    const token = req.params.token as string;
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
    const user: IUser = (await User.findById(req.user!._id).select("+password")) as IUser;

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

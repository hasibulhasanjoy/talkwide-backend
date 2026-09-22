import bcrypt from "bcrypt";
import crypto from "crypto";

import IUser from "../interfaces/user.interface.js";
import PendingUser from "../models/pendingUser.model.js";
import ResetToken from "../models/resetToken.model.js";
import User from "../models/user.model.js";
import { SignUpData } from "../schemas/auth.schema.js";
import AppError from "../utils/appError.class.js";

interface VerificationDispatch {
  token: string;
  username: string;
  email: string;
}

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const createHashedToken = (): { rawToken: string; hashedToken: string } => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, hashedToken };
};

/**
 * Stages a signup: hashes the password and stores everything in PendingUser,
 * keyed by a hashed verification token. No User document is created yet.
 */
export const initiateSignupService = async (data: SignUpData): Promise<VerificationDispatch> => {
  const { username, displayName, email, password } = data;

  const hashedPassword = await bcrypt.hash(password, 12);
  const { rawToken, hashedToken } = createHashedToken();

  // Replace any previous unverified attempt for this email
  await PendingUser.deleteOne({ email });

  await PendingUser.create({
    username,
    displayName,
    email,
    password: hashedPassword,
    tokenHashed: hashedToken,
    expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
  });

  return { token: rawToken, username, email };
};

/**
 * Verifies the token, promotes the PendingUser record into a real User,
 * and returns the newly created user.
 */
export const verifySignupService = async (token: string): Promise<IUser> => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const pending = await PendingUser.findOne({
    tokenHashed: hashedToken,
    expiresAt: { $gt: new Date() },
  }).select("+password");

  if (!pending) {
    throw new AppError("Verification link is invalid or expired. Please sign up again.", 400);
  }

  // Final race-condition check: someone else may have taken this
  // username/email while this signup sat unverified.
  const conflict = await User.findOne({
    $or: [{ email: pending.email }, { username: pending.username }],
  });

  if (conflict) {
    await PendingUser.deleteOne({ _id: pending._id });
    throw new AppError(
      "That username or email was taken while your signup was pending. Please sign up again.",
      409
    );
  }

  const newUser = new User({
    username: pending.username,
    displayName: pending.displayName,
    email: pending.email,
    password: pending.password, // already hashed
    emailVerifiedAt: new Date(),
  }) as IUser & { $locals: { skipPasswordHash?: boolean } };

  newUser.$locals.skipPasswordHash = true;
  await newUser.save();

  await PendingUser.deleteOne({ _id: pending._id });

  return newUser;
};

/**
 * Issues a fresh verification token for an existing pending signup
 * (used when the original email never arrived or the link expired).
 */
export const resendSignupVerificationService = async (
  email: string
): Promise<VerificationDispatch> => {
  const pending = await PendingUser.findOne({ email });

  if (!pending) {
    throw new AppError("No pending signup found for that email. Please sign up first.", 404);
  }

  const { rawToken, hashedToken } = createHashedToken();

  pending.tokenHashed = hashedToken;
  pending.expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  await pending.save();

  return { token: rawToken, username: pending.username, email: pending.email };
};

export const forgotPasswordService = async (user: IUser) => {
  const resetToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  await ResetToken.deleteMany({ userId: user._id });

  await ResetToken.create({
    userId: user._id,
    tokenHashed: hashedToken,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // expires in 10 min
  });

  return resetToken;
};

export const resetPasswordService = async (token: string, newPassword: string) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const resetTokenDoc = await ResetToken.findOne({
    tokenHashed: hashedToken,
    expiresAt: { $gt: new Date() },
  });

  if (!resetTokenDoc) {
    throw new AppError("Token is invalid or expired", 400);
  }

  const user = await User.findById(resetTokenDoc.userId);

  if (!user) {
    throw new AppError("no user is found for that token", 404);
  }

  user.password = newPassword;
  await user.save();

  const jwtToken = user.generateAuthToken();

  await ResetToken.deleteOne({ _id: resetTokenDoc._id });

  return jwtToken;
};

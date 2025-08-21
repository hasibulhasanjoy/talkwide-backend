import bcrypt from "bcrypt";
import crypto from "crypto";

import IUser from "../interfaces/user.interface.js";
import ResetToken from "../models/resetToken.model.js";
import User from "../models/user.model.js";
import AppError from "../utils/appError.class.js";

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

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();
  
  const jwtToken = user.generateAuthToken();

  await ResetToken.deleteOne({ _id: resetTokenDoc._id });

  return jwtToken;
};

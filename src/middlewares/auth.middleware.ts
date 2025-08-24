import { NextFunction, Request, Response } from "express";

import IUser from "../interfaces/user.interface.js";
import User from "../models/user.model.js";
import AppError from "../utils/appError.class.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.utils.js";
import { verifyToken } from "../utils/verifyToken.util.js";

export const authenticateUser = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.headers.authorization?.split(" ")[1];
    const secret = process.env.JWT_SECRET_KEY as string;
    if (!token) {
      return next(new AppError("access denied.no token provided", 401));
    }

    const decoded = await verifyToken(token, secret);

    const user: IUser | null = await User.findById(decoded.id);

    if (!user) {
      return next(new AppError("invalid user", 401));
    }

    req.user = user;
    next();
  }
);

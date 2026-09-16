import { NextFunction, Request, Response } from "express";

import AppError from "../utils/appError.class.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const globalErrorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ status: err.status, message: err.message });
    return;
  }

  if (isRecord(err)) {
    if (err.code === 11000) {
      const keyValue = isRecord(err.keyValue) ? err.keyValue : {};
      const field = Object.keys(keyValue)[0] ?? "field";
      res.status(400).json({
        status: "fail",
        message: `${field} is already in use. Please choose a different ${field}.`,
      });
      return;
    }

    if (err.name === "CastError") {
      res.status(400).json({ status: "fail", message: `Invalid value for "${String(err.path)}".` });
      return;
    }

    if (err.name === "ValidationError" && isRecord(err.errors)) {
      const message = Object.values(err.errors)
        .map((e) => (isRecord(e) && typeof e.message === "string" ? e.message : "Invalid input"))
        .join(", ");
      res.status(400).json({ status: "fail", message });
      return;
    }

    if (err.name === "JsonWebTokenError") {
      res.status(401).json({ status: "fail", message: "Invalid token. Please log in again." });
      return;
    }
    if (err.name === "TokenExpiredError") {
      res.status(401).json({ status: "fail", message: "Session expired. Please log in again." });
      return;
    }
  }

  console.error("UNEXPECTED ERROR 💥", err);
  res.status(500).json({ status: "internal server error", message: "Something went wrong." });
};

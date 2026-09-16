import { NextFunction, Request, Response } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

import AppError from "../utils/appError.class.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

interface DuplicateKeyError {
  code: 11000;
  keyValue: Record<string, unknown>;
}

const isDuplicateKeyError = (err: unknown): err is DuplicateKeyError =>
  isRecord(err) && err.code === 11000 && isRecord(err.keyValue);

export const handleCastError = (err: mongoose.Error.CastError): AppError => {
  return new AppError(`Invalid value "${String(err.value)}" for field "${err.path}".`, 400);
};

export const handleDuplicateKeyError = (err: DuplicateKeyError): AppError => {
  const field = Object.keys(err.keyValue)[0] ?? "field";
  const value = err.keyValue[field];
  return new AppError(
    `${field} "${String(value)}" is already in use. Please choose a different ${field}.`,
    400
  );
};

export const handleValidationError = (err: mongoose.Error.ValidationError): AppError => {
  const message = Object.values(err.errors)
    .map((e) => e.message)
    .join(", ");
  return new AppError(message, 400);
};

export const handleJWTError = (): AppError => {
  return new AppError("Invalid token. Please log in again.", 401);
};

export const handleJWTExpiredError = (): AppError => {
  return new AppError("Session expired. Please log in again.", 401);
};

export const handleZodError = (err: ZodError): AppError => {
  const message = fromZodError(err).message;
  return new AppError(message, 400);
};

export const sendErrorDev = (err: AppError, res: Response): void => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

export const sendErrorProd = (err: AppError, res: Response): void => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
    return;
  }

  // Unknown/programming error: don't leak internals to the client
  console.error("UNEXPECTED ERROR 💥", err);
  res.status(500).json({
    status: "internal server error",
    message: "Something went wrong.",
  });
};

const normalizeError = (err: unknown): AppError => {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof mongoose.Error.CastError) {
    return handleCastError(err);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return handleValidationError(err);
  }

  if (isDuplicateKeyError(err)) {
    return handleDuplicateKeyError(err);
  }

  if (err instanceof TokenExpiredError) {
    return handleJWTExpiredError();
  }

  if (err instanceof JsonWebTokenError) {
    return handleJWTError();
  }

  if (err instanceof ZodError) {
    return handleZodError(err);
  }

  const message = err instanceof Error ? err.message : "Something went wrong.";
  const fallback = new AppError(message, 500, false);
  if (err instanceof Error && err.stack) {
    fallback.stack = err.stack;
  }
  return fallback;
};

export const globalErrorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const error = normalizeError(err);

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(error, res);
    return;
  }

  sendErrorProd(error, res);
};

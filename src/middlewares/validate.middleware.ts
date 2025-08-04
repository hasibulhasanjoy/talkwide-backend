import { NextFunction, Request, Response } from "express";
import { ZodObject } from "zod";
import { fromZodError } from "zod-validation-error";

import AppError from "../utils/appError.class.js";

export const validate = (schema: ZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = fromZodError(result.error).details[0].message;
      throw new AppError(message, 400);
    }

    req.body = result.data;
    next();
  };
};

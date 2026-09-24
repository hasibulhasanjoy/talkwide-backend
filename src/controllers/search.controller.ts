import { NextFunction, Request, Response } from "express";

import { SearchQueryData } from "../schemas/search.schema.js";
import { performSearch } from "../services/search.service.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.utils.js";

export const search = asyncErrorHandler(
  async (_req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const { q, type } = res.locals.validatedQuery as SearchQueryData;

    const results = await performSearch(q, type);

    res.status(200).json({
      status: "success",
      results,
      count: results.length,
    });
  }
);

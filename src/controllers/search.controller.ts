import { NextFunction, Request, Response } from "express";

import { performSearch } from "../services/search.service.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.utils.js";

interface SearchQueryParams {
  q: string;
  type?: "user" | "community" | "all";
}

export const search = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const { q, type = "all" } = req.query;

    const results = await performSearch(q, type);

    res.status(200).json({
      status: "success",
      results,
      count: results.length,
    });
  }
);

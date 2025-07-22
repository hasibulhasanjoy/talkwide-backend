import { NextFunction, Request, RequestHandler, Response } from "express";

type asyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;

type wrapperFunction = (requestHandler: asyncHandler) => RequestHandler;

const asyncErrorHandler: wrapperFunction = (requestHandler) => {
  return (req, res, next) => {
    return requestHandler(req, res, next).catch(next);
  };
};

export default asyncErrorHandler;

import type { NextFunction, Request, RequestHandler, Response } from "express";

// Strips keys containing MongoDB operators ($gt, $ne, ...) or dotted paths
// from body / params / query to prevent NoSQL injection.
// Written as custom middleware because express-mongo-sanitize is
// incompatible with Express 5's read-only `req.query` getter.

type PlainObject = Record<string, unknown>;

const isPlainObject = (value: unknown): value is PlainObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isSafeKey = (key: string): boolean => !key.startsWith("$") && !key.includes(".");

const sanitizeObject = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sanitizeObject);
  }

  if (isPlainObject(value)) {
    const result: PlainObject = {};
    for (const [key, val] of Object.entries(value)) {
      if (isSafeKey(key)) {
        result[key] = sanitizeObject(val);
      }
    }
    return result;
  }

  return value;
};

const sanitizeMiddleware: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (isPlainObject(req.body)) {
    req.body = sanitizeObject(req.body) as typeof req.body;
  }

  if (isPlainObject(req.params)) {
    req.params = sanitizeObject(req.params) as typeof req.params;
  }

  // req.query is a getter in Express 5; mutate the object in place
  // instead of reassigning the property.
  if (isPlainObject(req.query)) {
    for (const key of Object.keys(req.query)) {
      if (!isSafeKey(key)) {
        delete req.query[key];
      } else {
        (req.query as PlainObject)[key] = sanitizeObject(req.query[key]);
      }
    }
  }

  next();
};

export default sanitizeMiddleware;

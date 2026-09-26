// src/app.ts
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import morgan from "morgan";

import passport from "./config/passport.config.js";
import { globalErrorHandler } from "./middlewares/error.middleware.js";
import sanitizeMiddleware from "./middlewares/sanitize.middleware.js";
import commentRouter from "./routes/comment.route.js";
import communityRouter from "./routes/community.route.js";
import oauthRouter from "./routes/oauth.route.js";
import postRouter from "./routes/post.route.js";
import searchRouter from "./routes/search.route.js";
import userRouter from "./routes/user.route.js";
import AppError from "./utils/appError.class.js";

const app = express();

// Trust the first proxy (needed behind Render/Nginx/etc. so rate limiting
// and secure behavior use the real client IP)
app.set("trust proxy", 1);

// Basic security headers (X-Frame-Options, HSTS, no-sniff, etc.)
app.use(helmet());

// CORS: only allow the frontend origins listed in FRONTEND_URL
// (comma-separated for multiple environments, e.g. staging + production)
const allowedOrigins = (process.env.FRONTEND_URL ?? "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no Origin header (curl, mobile apps, health checks)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new AppError("Not allowed by CORS", 403));
    },
    credentials: true,
  })
);

// Global rate limiter: 300 requests per 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { status: "error", message: "Too many requests, please try again later." },
});
app.use("/api", globalLimiter);

// Stricter limiter for auth routes: 20 requests per 15 min per IP
// (brute-force protection for OAuth token flows)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { status: "error", message: "Too many attempts, please try again later." },
});
app.use("/api/auth", authLimiter);

// HTTP request logging: concise in dev, standard Apache-style in production
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// Body parsers with strict size limits
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Strip MongoDB operator keys ($gt, $ne, ...) from body/params/query
app.use(sanitizeMiddleware);

// Prevent HTTP parameter pollution (duplicate query params like ?sort=a&sort=b)
app.use(hpp());

app.use(passport.initialize());

app.use("/api/auth", oauthRouter);
app.use("/api/users", userRouter);
app.use("/api/posts", postRouter);
app.use("/api/comments", commentRouter);
app.use("/api/communities", communityRouter);
app.use("/api/search", searchRouter);

app.use((req, _res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

export default app;

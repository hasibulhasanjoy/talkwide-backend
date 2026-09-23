// src/app.ts
import cors from "cors";
import express from "express";
import morgan from "morgan";

import passport from "./config/passport.config.js";
import { globalErrorHandler } from "./middlewares/error.middleware.js";
import commentRouter from "./routes/comment.route.js";
import communityRouter from "./routes/community.route.js";
import oauthRouter from "./routes/oauth.route.js";
import postRouter from "./routes/post.route.js";
import userRouter from "./routes/user.route.js";
import AppError from "./utils/appError.class.js";

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));
app.use(passport.initialize());

app.use("/api/auth", oauthRouter);
app.use("/api/users", userRouter);
app.use("/api/posts", postRouter);
app.use("/api/comments", commentRouter);
app.use("/api/communities", communityRouter);

app.use((req, _res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

export default app;

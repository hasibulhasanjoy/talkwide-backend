// src/app.ts
import cors from "cors";
import express from "express";
import morgan from "morgan";

import { globalErrorHandler } from "./middlewares/error.middleware.js";
import userRouter from "./routes/user.route.js";
import AppError from "./utils/appError.class.js";

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));

app.use("/api/users", userRouter);

app.use((req, _res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

export default app;

import cors from "cors";
import express from "express";
import morgan from "morgan";

import userRouter from "./routes/user.route.js";

const app = express();

app.use(cors());
// app.options("/*", cors());

app.use(morgan("dev"));

app.use(express.json({ limit: "10kb" }));

app.use("/api/users", userRouter);

export default app;

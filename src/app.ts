import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";

dotenv.config();

const app = express();

app.use(cors());
// app.options("/*", cors());

app.use(morgan("dev"));

export default app;

import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";

const PORT: number = Number(process.env.PORT) || 5500;

await connectDB();

app.listen(PORT, () => {
  console.log(`🚀 server is running on port:${PORT}`);
});

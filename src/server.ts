// IMPORTANT: This must be the first import to load env vars before anything else
import "./dotenv-init.js";

import app from "./app.js";
import connectDB from "./config/db.js";

const PORT: number = Number(process.env.PORT) || 5500;

await connectDB();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is running on port: ${PORT}`);
});

import app from "./app.js";

const PORT: number = 5500;

app.listen(PORT, () => {
  console.log(`server is running on port:${PORT}`);
});

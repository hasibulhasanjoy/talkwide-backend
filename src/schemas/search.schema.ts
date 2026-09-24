import { z } from "zod";

export const searchSchema = z.object({
  q: z.string().min(1, "Search query is required"),
  type: z.enum(["user", "community", "all"]).optional().default("all"),
});

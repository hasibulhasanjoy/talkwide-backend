import { z } from "zod";

export const searchSchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "Search query is required")
    .max(100, "Search query cannot exceed 100 characters"),
  type: z.enum(["user", "community", "all"]).default("all"),
});

export type SearchQueryData = z.infer<typeof searchSchema>;

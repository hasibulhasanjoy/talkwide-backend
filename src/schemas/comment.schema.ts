import { z } from "zod";

// Body schema shared by "create comment" and "reply to comment" (both send `content`).
export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment content cannot be empty")
    .max(10000, "Comment cannot exceed 10,000 characters"),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment content cannot be empty")
    .max(10000, "Comment cannot exceed 10,000 characters"),
});

export type CreateCommentData = z.infer<typeof createCommentSchema>;
export type UpdateCommentData = z.infer<typeof updateCommentSchema>;

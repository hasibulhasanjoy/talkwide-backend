import { z } from "zod";

export const createPostSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(300, "Title cannot exceed 300 characters"),
    type: z.enum(["text", "link", "image"]),
    content: z.string().max(40000, "Content cannot exceed 40,000 characters").optional(),
    linkUrl: z.string().url("Invalid link URL").optional(),
    community: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid community ID format")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.type === "link") {
        return Boolean(data.linkUrl);
      }
      return true;
    },
    {
      message: "Link URL is required for link posts",
      path: ["linkUrl"],
    }
  );

export const updatePostSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(300, "Title cannot exceed 300 characters")
      .optional(),
    content: z.string().max(40000, "Content cannot exceed 40,000 characters").optional(),
  })
  .refine((data) => data.title !== undefined || data.content !== undefined, {
    message: "At least one field (title or content) must be provided to update",
  });

export const voteSchema = z.object({
  voteType: z.enum(["upvote", "downvote", "remove"]),
});

export const postQuerySchema = z.object({
  sort: z.enum(["hot", "new", "top"]).default("hot"),
  time: z.enum(["hour", "day", "week", "month", "year", "all"]).default("day"),
  community: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid community ID")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePostData = z.infer<typeof createPostSchema>;
export type UpdatePostData = z.infer<typeof updatePostSchema>;
export type VoteData = z.infer<typeof voteSchema>;
export type PostQueryData = z.infer<typeof postQuerySchema>;

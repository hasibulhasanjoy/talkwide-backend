import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createCommunitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Community name must be at least 3 characters")
    .max(50, "Community name cannot exceed 50 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Community name can only contain letters, numbers, and underscores"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
});

export const updateCommunitySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Community name must be at least 3 characters")
      .max(50, "Community name cannot exceed 50 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Community name can only contain letters, numbers, and underscores")
      .optional(),
    description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: "At least one field (name or description) must be provided to update",
  });

export const manageMemberSchema = z.object({
  userId: z.string().regex(objectIdRegex, "Invalid user ID format"),
});

export const updateMemberRoleSchema = z.object({
  userId: z.string().regex(objectIdRegex, "Invalid user ID format"),
  role: z.enum(["moderator", "admin"], {
    message: "Role must be 'moderator' or 'admin'",
  }),
});

export type CreateCommunityData = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityData = z.infer<typeof updateCommunitySchema>;
export type ManageMemberData = z.infer<typeof manageMemberSchema>;
export type UpdateMemberRoleData = z.infer<typeof updateMemberRoleSchema>;

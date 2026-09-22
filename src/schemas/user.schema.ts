import { z } from "zod";

export const usernameParamSchema = z.object({
  username: z.string().trim().min(3, "username must be at least 3 characters"),
});

export const updateProfileSchema = z
  .object({
    username: z.string().trim().min(3, "username must be at least 3 characters").optional(),
    displayName: z.string().trim().nonempty("display name is required").optional(),
    bio: z.string().trim().max(500, "bio must not exceed 500 characters").optional(),
    avatarUrl: z.string().url("invalid avatar URL").optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      // Ensure at least one field is provided
      return Object.keys(data).length > 0;
    },
    {
      message: "at least one field must be provided for update",
    }
  );

export type UsernameParamData = z.infer<typeof usernameParamSchema>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;

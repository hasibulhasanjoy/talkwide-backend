import { z } from "zod";

export const usernameParamSchema = z.object({
  username: z.string().trim().min(3, "username must be at least 3 characters"),
});

export type UsernameParamData = z.infer<typeof usernameParamSchema>;
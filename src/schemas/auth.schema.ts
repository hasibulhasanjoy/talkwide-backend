import { z } from "zod";

const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const signUpSchema = z
  .object({
    username: z.string().min(3, "username must be at least 3 characters"),
    displayName: z.string("display name is required"),
    email: z.email("invalid email address"),
    password: z
      .string()
      .regex(
        passwordRegex,
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "password do not match",
    path: ["confirmPassword"],
  });

export type SignUpData = z.infer<typeof signUpSchema>;

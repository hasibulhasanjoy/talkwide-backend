import { z } from "zod";

const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const signUpSchema = z
  .object({
    username: z.string().trim().min(3, "username must be at least 3 characters"),
    displayName: z.string().trim().nonempty("display name is required"),
    email: z.email("invalid email address").trim(),
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

export const loginSchema = z
  .object({
    username: z.string().trim().min(3, "username must be at least 3 characters").optional(),
    email: z.email("invalid email address").trim().optional(),
    password: z
      .string()
      .regex(
        passwordRegex,
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
      ),
  })
  .refine((data) => data.username || data.email, {
    message: "username or email is required for login",
    path: ["username or email"],
  });

export const forgotPasswordSchema = z.object({
  email: z.email("invalid email address").trim(),
});

export const resetPasswordSchema = z
  .object({
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

export const changePasswordSchema = z
  .object({
    oldPassword: z.string(),
    newPassword: z
      .string()
      .regex(
        passwordRegex,
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "password do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "New password must be different from the old password",
    path: ["newPassword"],
  });

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
});

export type SignUpData = z.infer<typeof signUpSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type GoogleAuthData = z.infer<typeof googleAuthSchema>;

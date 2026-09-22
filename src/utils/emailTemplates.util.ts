export const welcomeTemplate = (username: string) => {
  const html = `<h1>Hi ${username}!</h1>
  <p>Welcome to Talkwide. Start engaging today!</p>`;

  return html;
};

export const passwordResetTemplate = (username: string, resetUrl: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
    <h2>Password Reset Request</h2>
    <p>Hello <strong>${username || "there"}</strong>,</p>
    <p>We received a request to reset your password. Click the button below:</p>
    <a href="${resetUrl}"
       style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #fff;
              text-decoration: none; border-radius: 5px; font-weight: bold;">
      Reset Password
    </a>
    <p style="margin-top:20px;">
      If you didn’t request this, you can safely ignore this email.
    </p>
    <p>— Talkwide Team</p>
  </div>
  `;

  return html;
};

/**
 * Generates an HTML email verification template.
 *
 * @param username - The user’s display name
 * @param verificationUrl - The URL the user clicks to verify their email
 * @returns HTML string for the verification email
 */
export const emailVerificationTemplate = (username: string, verificationUrl: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Verify Your Email Address</h2>
      <p>Hello <strong>${username}</strong>,</p>
      <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
      <a href="${verificationUrl}"
         style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #fff;
                text-decoration: none; border-radius: 5px; font-weight: bold;">
        Verify Email
      </a>
      <p style="margin-top: 20px;">
        This verification link will expire in <strong>1 hour</strong>.
      </p>
      <p style="margin-top: 20px; color: #666; font-size: 12px;">
        If you didn’t create an account with Talkwide, you can safely ignore this email.
      </p>
      <p>— Talkwide Team</p>
    </div>
  `;

  return html;
};

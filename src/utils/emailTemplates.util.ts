export const welcomeTemplate = (username: string) => {
  const html = `<h1>Hi ${username}!</h1>
  <p>Welcome to Talkwide. Start engaging today!</p>`;

  return html;
};

export const resetTokenTemplate = (username: string, resetUrl: string) => {
  const html = `
    Hello ${username || "there"},

    We received a request to reset your password. Click the link below to reset it:

    ${resetUrl}

    If you did not request a password reset, please ignore this email.

    Best regards,
    Tour Team
  `;

  return html;
};

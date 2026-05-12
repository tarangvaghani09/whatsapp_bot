import nodemailer from "nodemailer";

function getRequired(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set for email sending`);
  return value;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, expiresInMinutes: number) {
  const host = getRequired("SMTP_HOST");
  const port = Number(process.env["SMTP_PORT"] ?? "587");
  const user = getRequired("SMTP_USER");
  const pass = getRequired("SMTP_PASS");
  const from = getRequired("SMTP_FROM");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject: "Reset your WhatsApp Bot Admin password",
    text: [
      "We received a password reset request.",
      `Reset link: ${resetUrl}`,
      `This link expires in ${expiresInMinutes} minutes.`,
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <p>We received a password reset request.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link expires in <strong>${expiresInMinutes} minutes</strong>.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}

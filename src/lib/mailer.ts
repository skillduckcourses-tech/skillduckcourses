import nodemailer from "nodemailer";

export function mailer() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) return null;
  return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } });
}

export async function sendTransactionalEmail(to: string, subject: string, html: string) {
  const transport = mailer();
  if (!transport) return { sent: false, reason: "SMTP is not configured." };
  await transport.sendMail({ from: process.env.MAIL_FROM || "notifications@theelitegrow.me", to, subject, html });
  return { sent: true };
}
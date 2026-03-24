/**
 * Email sending via Nodemailer + Brevo SMTP.
 * All user-supplied values are HTML-escaped before template interpolation
 * to prevent HTML injection attacks in email clients.
 */

import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { escapeHtml } from "./sanitize";

// ─── Transport ────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: parseInt(env.SMTP_PORT, 10),
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

// ─── Send helper ──────────────────────────────────────────────────────────────

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends a transactional email. Non-blocking — awaiting is optional for
 * fire-and-forget notification emails, but await when delivery matters.
 */
export async function sendMail(options: MailOptions): Promise<void> {
  try {
    const info = await transporter.sendMail({
      from: `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM_ADDRESS}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    logger.info({ messageId: info.messageId, to: options.to }, "Email sent");
  } catch (err) {
    // Log but don't throw — a failed notification should never crash a request
    logger.error({ err, to: options.to, subject: options.subject }, "Email send failed");
  }
}

// ─── Layout wrapper ───────────────────────────────────────────────────────────

function layout(title: string, body: string): string {
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const year = new Date().getFullYear();

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,.05);">
        <tr>
          <td style="background:#00A650;padding:28px 24px;text-align:center;">
            <span style="color:#fff;font-size:26px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">CoachMe</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="background:#1a1a1a;padding:18px 24px;text-align:center;">
            <p style="margin:0;color:#999;font-size:12px;">
              &copy; ${year} CoachMe by Ecotosport. All rights reserved.<br>
              <a href="${appUrl}" style="color:#00A650;text-decoration:none;">Home</a>
              &nbsp;&middot;&nbsp;
              <a href="${appUrl}/contact" style="color:#00A650;text-decoration:none;">Support</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

const btn = (href: string, text: string) =>
  `<a href="${href}" style="display:inline-block;padding:12px 28px;background:#00A650;color:#fff;text-decoration:none;border-radius:5px;font-weight:700;margin:20px 0;">${escapeHtml(text)}</a>`;

// ─── Templates ────────────────────────────────────────────────────────────────
// NOTE: every user-supplied variable goes through escapeHtml() before
// appearing in any template — no exceptions.

export function getProspectWelcomeTemplate(name: string): string {
  return layout("Welcome to CoachMe", /* html */ `
    <h2 style="color:#00A650;margin-top:0;">Welcome to CoachMe!</h2>
    <p>Hi <strong>${escapeHtml(name)}</strong>,</p>
    <p>Thank you for joining CoachMe. We're excited to have you as part of our sport community.</p>
    <p>Browse certified coaches and start your journey today.</p>
    ${btn(`${env.NEXT_PUBLIC_APP_URL}/coaches`, "Explore Coaches")}
    <p style="margin-bottom:0;">Stay healthy,<br>The CoachMe Team</p>
  `);
}

export function getCoachWelcomeTemplate(name: string): string {
  return layout("Welcome to the CoachMe Team", /* html */ `
    <h2 style="color:#00A650;margin-top:0;">Welcome, Coach ${escapeHtml(name)}!</h2>
    <p>Your application is currently <strong>under review</strong>. We'll verify your credentials and notify you by email once approved.</p>
    <p>In the meantime, complete your profile to be ready when you go live.</p>
    ${btn(`${env.NEXT_PUBLIC_APP_URL}/profile`, "Complete Your Setup")}
    <p style="margin-bottom:0;">Best regards,<br>The CoachMe Team</p>
  `);
}

export function getCoachApprovedTemplate(name: string): string {
  return layout("Your Profile is Approved!", /* html */ `
    <h2 style="color:#00A650;margin-top:0;">Congratulations, ${escapeHtml(name)}!</h2>
    <p>Your coach profile is now <strong>live</strong> and visible to clients on the platform.</p>
    ${btn(`${env.NEXT_PUBLIC_APP_URL}/coach/dashboard`, "Go to Your Dashboard")}
    <p style="margin-bottom:0;">Wishing you great success,<br>The CoachMe Team</p>
  `);
}

export function getCoachRejectedTemplate(name: string): string {
  return layout("Profile Update Required", /* html */ `
    <h2 style="color:#c0392b;margin-top:0;">Action Required</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>We reviewed your profile and were unable to approve it in its current state. This is usually due to missing information or unclear certifications.</p>
    <p>Please log in, update your profile, and resubmit.</p>
    ${btn(`${env.NEXT_PUBLIC_APP_URL}/profile`, "Update Profile")}
    <p style="margin-bottom:0;">Best regards,<br>The CoachMe Team</p>
  `);
}

export function getAdminNewCoachAlertTemplate(coachName: string, email: string): string {
  return layout("New Coach Application", /* html */ `
    <h2 style="color:#00A650;margin-top:0;">New Coach Application</h2>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#666;width:120px;">Name</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(coachName)}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;">${escapeHtml(email)}</td></tr>
    </table>
    ${btn(`${env.NEXT_PUBLIC_APP_URL}/admin/users`, "Review in Dashboard")}
  `);
}

export function getNewMessageTemplate(senderName: string, content: string): string {
  return layout("New Message", /* html */ `
    <h2 style="color:#00A650;margin-top:0;">New message from ${escapeHtml(senderName)}</h2>
    <blockquote style="border-left:4px solid #00A650;margin:16px 0;padding:12px 16px;background:#f9f9f9;border-radius:0 4px 4px 0;font-style:italic;">
      ${escapeHtml(content)}
    </blockquote>
    ${btn(`${env.NEXT_PUBLIC_APP_URL}/messages`, "Reply")}
  `);
}

export function getContactInquiryTemplate(
  name: string,
  email: string,
  subject: string,
  message: string
): string {
  return layout("Contact Inquiry", /* html */ `
    <h2 style="color:#00A650;margin-top:0;">New Contact Form Submission</h2>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr><td style="padding:6px 0;color:#666;width:80px;">From</td><td style="padding:6px 0;">${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Subject</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(subject)}</td></tr>
    </table>
    <div style="background:#f9f9f9;padding:16px;border-radius:4px;white-space:pre-wrap;">${escapeHtml(message)}</div>
  `);
}

export function getForgotPasswordTemplate(resetUrl: string): string {
  return layout("Reset Your Password", /* html */ `
    <h2 style="color:#00A650;margin-top:0;">Reset Your Password</h2>
    <p>We received a request to reset your CoachMe password. Click below — this link expires in <strong>1 hour</strong>.</p>
    ${btn(resetUrl, "Reset Password")}
    <p style="color:#666;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
  `);
}

export function getAdminNewChatAlertTemplate(clientName: string, coachName: string): string {
  return layout("New Chat Started", /* html */ `
    <h2 style="color:#00A650;margin-top:0;">New Conversation</h2>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:6px 0;color:#666;width:80px;">Client</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(clientName)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Coach</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(coachName)}</td></tr>
    </table>
    ${btn(`${env.NEXT_PUBLIC_APP_URL}/admin/messages`, "View Conversations")}
  `);
}

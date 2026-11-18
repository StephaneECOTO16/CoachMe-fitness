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

// Two SMTP configurations can exist side by side:
//   - SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS  (primary, Brevo)
//   - MAIL_HOST / MAIL_PORT / MAIL_USERNAME / MAIL_PASSWORD / MAIL_ENCRYPTION (fallback)
// The primary is tried first; if it fails (bad credentials, server down),
// the email is retried once with the fallback.

type Transporter = ReturnType<typeof nodemailer.createTransport>;

interface SmtpConfig {
  name: string;
  host?: string;
  port: number;
  user?: string;
  pass?: string;
  /** "ssl" = implicit TLS, "tls" = STARTTLS, "none" = plain. */
  encryption: string;
}

function createTransporter(config: SmtpConfig): Transporter | null {
  if (!config.host || !config.user || !config.pass) return null;
  // Port 465 is always implicit TLS; any other port uses STARTTLS unless
  // explicitly disabled ("ssl" on 587 is a common misconfiguration that fails).
  const implicitTls = config.port === 465;
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: implicitTls,
    requireTLS: !implicitTls && config.encryption !== "none",
    auth: { user: config.user, pass: config.pass },
    // Fail fast instead of nodemailer's minutes-long defaults, so an
    // unreachable SMTP server never keeps a request (or after()) hanging.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

const transporters = [
  {
    name: "SMTP_*",
    host: process.env.SMTP_HOST,
    port: Number.parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    encryption: "tls",
  },
  {
    name: "MAIL_*",
    host: process.env.MAIL_HOST,
    port: Number.parseInt(process.env.MAIL_PORT || "587", 10),
    user: process.env.MAIL_USERNAME || process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
    encryption: (process.env.MAIL_ENCRYPTION || "tls").toLowerCase(),
  },
]
  .map((config) => ({ name: config.name, transporter: createTransporter(config) }))
  .filter((t): t is { name: string; transporter: Transporter } => t.transporter !== null);

// ─── Send helper ──────────────────────────────────────────────────────────────

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

interface SendMailOptions {
  /** Throw when delivery is essential, such as password reset emails. */
  throwOnError?: boolean;
}

/**
 * Sends a transactional email. Non-blocking — awaiting is optional for
 * fire-and-forget notification emails, but await when delivery matters.
 */
export async function sendMail(options: MailOptions, settings: SendMailOptions = {}): Promise<void> {
  let lastError: unknown = new Error("No SMTP configuration (set SMTP_* or MAIL_*)");

  for (const { name, transporter } of transporters) {
    try {
      const info = await transporter.sendMail({
        from: `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM_ADDRESS}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      logger.info({ messageId: info.messageId, to: options.to, smtp: name }, "Email sent");
      return;
    } catch (err) {
      lastError = err;
      const e = err as { code?: string; responseCode?: number; response?: string };
      logger.warn(
        { smtp: name, code: e.code, responseCode: e.responseCode, response: e.response, to: options.to },
        "SMTP send failed, trying next configuration",
      );
    }
  }

  // Log but don't throw — a failed notification should never crash a request
  logger.error({ err: lastError, to: options.to, subject: options.subject }, "Email send failed");
  if (settings.throwOnError) throw lastError;
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

export function getAdminCoachDisciplineChangedTemplate(
  coachName: string,
  email: string,
  oldDiscipline: string,
  newDiscipline: string
): string {
  return layout("Coach Discipline Changed", /* html */ `
    <h2 style="color:#00A650;margin-top:0;">Coach Discipline Changed — Review Required</h2>
    <p>An approved coach changed their discipline. Their profile is back to <strong>pending</strong> and hidden until you review it again.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#666;width:120px;">Name</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(coachName)}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;">${escapeHtml(email)}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Before</td><td style="padding:8px 0;">${escapeHtml(oldDiscipline)}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">After</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(newDiscipline)}</td></tr>
    </table>
    ${btn(`${env.NEXT_PUBLIC_APP_URL}/admin/coaches`, "Review in Dashboard")}
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

/**
 * @param accountLabel Optional account type ("client" / "coach"). Shown when
 *   the same email owns several accounts, so the user knows which one the
 *   link resets.
 */
/** Bilingual (French first, the platform's main language, then English). */
export function getForgotPasswordTemplate(resetUrl: string, accountLabel?: string): string {
  const frLabel: Record<string, string> = { client: "client", coach: "coach", admin: "admin" };
  const forAccountFr = accountLabel
    ? ` pour votre compte <strong>${escapeHtml(frLabel[accountLabel] ?? accountLabel)}</strong>`
    : "";
  const forAccountEn = accountLabel
    ? ` for your <strong>${escapeHtml(accountLabel)}</strong> account`
    : "";
  return layout("Réinitialisation du mot de passe / Reset your password", /* html */ `
    <h2 style="color:#00A650;margin-top:0;">Réinitialisation du mot de passe</h2>
    <p>Nous avons reçu une demande de réinitialisation de votre mot de passe CoachMe${forAccountFr}. Cliquez sur le bouton ci-dessous : ce lien expire dans <strong>1 heure</strong>.</p>
    ${btn(resetUrl, "Choisir un nouveau mot de passe")}
    <p style="color:#666;font-size:13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email : votre mot de passe ne change pas.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:28px 0;">
    <p style="color:#666;font-size:13px;"><strong>Reset your password</strong> — We received a request to reset your CoachMe password${forAccountEn}. Use the button above; the link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
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

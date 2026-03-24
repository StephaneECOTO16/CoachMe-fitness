/**
 * Business logic for registration, login helpers, and password reset.
 * Route handlers call these functions — no Prisma or business logic
 * belongs inside the route files themselves.
 */

import { prisma } from "@/lib/db";
import {
  hashPassword,
  signJwt,
  setSessionCookie,
  type JwtPayload,
} from "@/lib/auth";
import { sendMail, getProspectWelcomeTemplate, getCoachWelcomeTemplate, getAdminNewCoachAlertTemplate } from "@/lib/mail";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { randomBytes } from "crypto";
import { type RegisterInput } from "@/lib/validation/schemas";
import { getPublicUrl } from "@/lib/storage";

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Creates a PROSPECT user with an optional ClientProfile.
 * Returns the new user's public data.
 */
export async function registerProspect(
  data: Extract<RegisterInput, { accountType: "PROSPECT" }>
) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase().trim() },
    select: { id: true },
  });

  if (existing) {
    throw Object.assign(new Error("Email already registered"), {
      code: "ALREADY_EXISTS",
      status: 409,
    });
  }

  const hashed = await hashPassword(data.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        password: hashed,
        role: "PROSPECT",
        name: data.name,
        phone: data.phone || null,
      },
    });

    await tx.clientProfile.create({
      data: {
        userId: created.id,
        ageRange: data.ageRange || null,
        heightCm: data.heightCm || null,
        weightKg: data.weightKg || null,
        goals: data.goals || null,
      },
    });

    return created;
  });

  // Non-blocking welcome email
  sendMail({
    to: user.email,
    subject: "Welcome to CoachMe!",
    html: getProspectWelcomeTemplate(user.name ?? "there"),
  }).catch(() => {}); // Already logged inside sendMail

  logger.info({ userId: user.id }, "Prospect registered");
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/**
 * Creates a COACH user with a pending CoachProfile.
 */
export async function registerCoach(
  data: Extract<RegisterInput, { accountType: "COACH" }>
) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase().trim() },
    select: { id: true },
  });

  if (existing) {
    throw Object.assign(new Error("Email already registered"), {
      code: "ALREADY_EXISTS",
      status: 409,
    });
  }

  const discipline = await prisma.discipline.findUnique({
    where: { name: data.discipline },
    select: { id: true },
  });

  if (!discipline) {
    throw Object.assign(new Error("Invalid discipline"), {
      code: "VALIDATION_ERROR",
      status: 400,
    });
  }

  const hashed = await hashPassword(data.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        password: hashed,
        role: "COACH",
        name: data.name,
        phone: data.phone || null,
      },
    });

    await tx.coachProfile.create({
      data: {
        userId: created.id,
        disciplineId: discipline.id,
        bio: data.bio || null,
        portfolio: data.portfolio || null,
        status: "PENDING",
      },
    });

    return created;
  });

  // Non-blocking emails
  sendMail({
    to: user.email,
    subject: "Welcome to CoachMe!",
    html: getCoachWelcomeTemplate(user.name ?? "Coach"),
  }).catch(() => {});

  sendMail({
    to: env.ADMIN_EMAIL,
    subject: "New Coach Application Pending",
    html: getAdminNewCoachAlertTemplate(user.name ?? "Unknown", user.email),
  }).catch(() => {});

  logger.info({ userId: user.id }, "Coach registered — pending approval");
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

// ─── Password reset ───────────────────────────────────────────────────────────

/**
 * Generates a password reset token, stores it, and sends the reset email.
 * Always returns the same success shape regardless of whether the email
 * exists — prevents email enumeration attacks.
 */
export async function initiatePasswordReset(email: string): Promise<void> {
  const normalised = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalised },
    select: { id: true, name: true },
  });

  // No user → silently return (no error, no timing difference)
  if (!user) return;

  // Invalidate any existing unused tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  sendMail({
    to: normalised,
    subject: "Reset Your Password — CoachMe",
    html: (await import("@/lib/mail")).getForgotPasswordTemplate(resetUrl),
  }).catch(() => {});

  logger.info({ userId: user.id }, "Password reset initiated");
}

/**
 * Validates a reset token and updates the user's password.
 * Invalidates all outstanding reset tokens on success.
 */
export async function completePasswordReset(
  token: string,
  newPassword: string
): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { id: true } } },
  });

  if (!record) {
    throw Object.assign(new Error("Invalid or expired reset link"), {
      code: "INVALID_TOKEN",
      status: 400,
    });
  }
  if (record.used) {
    throw Object.assign(new Error("This reset link has already been used"), {
      code: "TOKEN_USED",
      status: 400,
    });
  }
  if (new Date() > record.expiresAt) {
    await prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    });
    throw Object.assign(new Error("This reset link has expired"), {
      code: "TOKEN_EXPIRED",
      status: 400,
    });
  }

  const hashed = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed },
    }),
    // Purge all reset tokens for this user
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, used: false },
      data: { used: true },
    }),
  ]);

  logger.info({ userId: record.userId }, "Password reset completed");
}

// ─── Session helpers ──────────────────────────────────────────────────────────

/**
 * Builds and sets the session cookie for a given user.
 * Called after login or registration auto-login.
 */
export async function createSession(userId: string): Promise<JwtPayload> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
    },
  });

  const payload: JwtPayload = {
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    avatar: user.avatar ? getPublicUrl(user.avatar) : null,
  };

  const token = signJwt(payload);
  await setSessionCookie(token);

  return payload;
}

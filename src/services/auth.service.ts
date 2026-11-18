/**
 * Business logic for registration, login helpers, and password reset.
 * Route handlers call these functions — no Prisma or business logic
 * belongs inside the route files themselves.
 */

import { prisma } from "@/lib/db";
import {
  hashPassword,
  issueSession,
  type JwtPayload,
} from "@/lib/auth";
import {
  sendMail,
  getProspectWelcomeTemplate,
  getCoachWelcomeTemplate,
  getAdminNewCoachAlertTemplate,
} from "@/lib/mail/index";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { createHash, randomBytes } from "crypto";
import { type RegisterInput } from "@/lib/validation/schemas";
import { getPublicUrl } from "@/lib/storage";
import { sendNotification } from "@/lib/notifications";
import { releaseIdentifiersFromDeletedUsers } from "@/lib/archived-identifiers";

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Creates a PROSPECT user with an optional ClientProfile.
 * Returns the new user's public data.
 */
export async function registerProspect(
  data: Extract<RegisterInput, { accountType: "PROSPECT" }>,
) {
  const normalizedEmail = data.email.toLowerCase().trim();
  const normalizedPhone = data.phone?.trim() || null;

  // Fast-fail on identifiers held by an *active* account of the SAME role
  // (email/phone are unique per role: a coach account with this email does
  // not block a client signup). Identifiers of admin-deleted accounts are
  // released inside the transaction below.
  const existing = await prisma.user.findFirst({
    where: {
      role: "PROSPECT",
      deletedAt: null,
      OR: [
        { email: normalizedEmail },
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      ],
    },
    select: { id: true, email: true, phone: true },
  });

  if (existing?.email === normalizedEmail) {
    throw Object.assign(new Error("An account with this email already exists for this role"), {
      code: "ALREADY_EXISTS",
      status: 409,
    });
  }

  if (normalizedPhone && existing?.phone === normalizedPhone) {
    throw Object.assign(new Error("An account with this phone number already exists for this role"), {
      code: "PHONE_ALREADY_EXISTS",
      status: 409,
    });
  }

  const hashed = await hashPassword(data.password);

  const user = await prisma.$transaction(async (tx) => {
    await releaseIdentifiersFromDeletedUsers(tx, { email: normalizedEmail, phone: normalizedPhone, role: "PROSPECT" });

    const created = await tx.user.create({
      data: {
        email: normalizedEmail,
        password: hashed,
        role: "PROSPECT",
        name: data.name,
        phone: normalizedPhone,
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

  // Await delivery so serverless runtimes do not freeze before the email is sent.
  await sendMail({
    to: user.email,
    subject: "Welcome to CoachMe!",
    html: getProspectWelcomeTemplate(user.name ?? "there"),
  }).catch((err) => logger.error({ err, userId: user.id }, "Prospect welcome email failed"));

  // Create in-app welcome notification
  sendNotification({
    userId: user.id,
    title: "Bienvenue sur CoachMe ! 🎉",
    body: "Votre compte a bien été créé. Trouvez le coach idéal dès maintenant.",
    type: "SYSTEM",
    url: "/coaches"
  }).catch(() => {});

  // Notify all admins of the new client — symmetric with registerCoach below,
  // so admins have visibility into every new account, not just coaches.
  prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } }).then(admins => {
    admins.forEach(admin => {
      sendNotification({
        userId: admin.id,
        title: "Nouveau client inscrit",
        body: `${user.name ?? user.email} vient de créer un compte client.`,
        type: "SYSTEM",
        url: "/admin/users"
      }).catch(() => {});
    });
  }).catch(() => {});

  logger.info({ userId: user.id }, "Prospect registered");
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/**
 * Creates a COACH user with a pending CoachProfile.
 */
export async function registerCoach(
  data: Extract<RegisterInput, { accountType: "COACH" }>,
) {
  const normalizedEmail = data.email.toLowerCase().trim();
  const normalizedPhone = data.phone.trim();

  // Fast-fail on active COACH accounts only (see registerProspect).
  const existing = await prisma.user.findFirst({
    where: {
      role: "COACH",
      deletedAt: null,
      OR: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    },
    select: { id: true, email: true, phone: true },
  });

  if (existing?.email === normalizedEmail) {
    throw Object.assign(new Error("An account with this email already exists for this role"), {
      code: "ALREADY_EXISTS",
      status: 409,
    });
  }

  if (existing?.phone === normalizedPhone) {
    throw Object.assign(new Error("An account with this phone number already exists for this role"), {
      code: "PHONE_ALREADY_EXISTS",
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
    await releaseIdentifiersFromDeletedUsers(tx, { email: normalizedEmail, phone: normalizedPhone, role: "COACH" });

    const created = await tx.user.create({
      data: {
        email: normalizedEmail,
        password: hashed,
        role: "COACH",
        name: data.name,
        phone: normalizedPhone,
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

  // Await delivery so the welcome email is not lost when the response closes.
  await sendMail({
    to: user.email,
    subject: "Welcome to CoachMe!",
    html: getCoachWelcomeTemplate(user.name ?? "Coach"),
  }).catch((err) => logger.error({ err, userId: user.id }, "Coach welcome email failed"));

  await sendMail({
    to: env.ADMIN_EMAIL,
    subject: "New Coach Application Pending",
    html: getAdminNewCoachAlertTemplate(user.name ?? "Unknown", user.email),
  }).catch((err) => logger.error({ err, userId: user.id }, "Admin coach alert email failed"));

  // Create in-app welcome notification for coach
  sendNotification({
    userId: user.id,
    title: "Candidature reçue 🏋️",
    body: "Votre profil est en cours d'examen. Vous serez notifié dès qu'il sera approuvé.",
    type: "SYSTEM",
    url: "/coach/dashboard"
  }).catch(() => {});

  // Notify all admins of new application via Push
  prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } }).then(admins => {
    admins.forEach(admin => {
      sendNotification({
        userId: admin.id,
        title: "Nouvelle candidature Coach",
        body: `${user.name} vient de s'inscrire et attend votre validation.`,
        type: "ACCOUNT_REVIEW",
        url: "/admin/coaches"
      }).catch(() => {});
    });
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

  // An email can own one account per role (e.g. client + coach): send one
  // reset link per account, labelled with its type when there are several.
  const users = await prisma.user.findMany({
    where: { email: normalised, deletedAt: null },
    select: { id: true, name: true, role: true },
    orderBy: { createdAt: "asc" },
  });

  // No user → silently return (no error, no timing difference)
  if (users.length === 0) return;

  const { getForgotPasswordTemplate } = await import("@/lib/mail/index");
  let firstError: unknown = null;

  for (const user of users) {
    // Invalidate any existing unused tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const resetToken = await prisma.passwordResetToken.create({
      data: { userId: user.id, token: tokenHash, expiresAt },
    });

    const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
    const label =
      users.length > 1 ? (user.role === "COACH" ? "coach" : user.role === "ADMIN" ? "admin" : "client") : undefined;

    try {
      await sendMail({
        to: normalised,
        subject: label
          ? `Réinitialisation du mot de passe (compte ${label}) — CoachMe`
          : "Réinitialisation de votre mot de passe — CoachMe",
        html: getForgotPasswordTemplate(resetUrl, label),
      }, { throwOnError: true });
      logger.info({ userId: user.id }, "Password reset initiated");
    } catch (error) {
      await prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { used: true } });
      firstError ??= error;
    }
  }

  if (firstError) throw firstError;
}

/**
 * Validates a reset token and updates the user's password.
 * Invalidates all outstanding reset tokens on success.
 */
export async function completePasswordReset(
  token: string,
  newPassword: string,
): Promise<void> {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({
    where: { token: tokenHash },
    include: { user: { select: { id: true } } },
  }) ?? await prisma.passwordResetToken.findUnique({
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
    // passwordChangedAt logs out every device still using the old password
    // (e.g. someone who had access to the account).
    prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed, passwordChangedAt: new Date() },
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

  await issueSession(payload, true);

  return payload;
}

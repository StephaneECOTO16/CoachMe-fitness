/**
 * Business logic for user profile reads and updates.
 * Handles both coach and prospect profile types behind a single interface.
 */

import { prisma } from "@/lib/db";
// import { getPublicUrl, deleteFromStorage } from "@/lib/storage";
import { signJwt, setSessionCookie } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type {
  UpdateBasicInfoInput,
  UpdateCoachProfileInput,
  UpdateClientProfileInput,
  BecomeCoachInput,
} from "@/lib/validation/schemas";
import { deleteFromStorage, getPublicUrl } from "@/lib/storage";
import { releaseIdentifiersFromDeletedUsers } from "@/lib/archived-identifiers";

// ─── Profile fetch ────────────────────────────────────────────────────────────

/**
 * Fetches a user's full profile including role-specific data.
 * Resolves R2 keys to public URLs on read.
 */
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      avatar: true,
      createdAt: true,
      coachProfile: {
        include: {
          discipline: true,
          media: { orderBy: { createdAt: "desc" } },
        },
      },
      clientProfile: true,
    },
  });

  if (!user) return null;

  return {
    ...user,
    avatar: user.avatar ? getPublicUrl(user.avatar) : null,
    coachProfile: user.coachProfile
      ? {
          ...user.coachProfile,
          media: user.coachProfile.media.map((m) => ({
            ...m,
            url: getPublicUrl(m.url),
          })),
        }
      : null,
  };
}

// ─── Basic info update ────────────────────────────────────────────────────────

/**
 * Updates name and phone on the User model.
 * Re-issues the session cookie with fresh claims so the client
 * sees the updated name immediately without logging out.
 */
export async function updateBasicInfo(
  userId: string,
  data: UpdateBasicInfoInput
) {
  // Phone is unique per role: refuse a number already used by another
  // account of the same role (instead of failing on the DB constraint).
  if (data.phone) {
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const taken = current
      ? await prisma.user.findFirst({
          where: { phone: data.phone, role: current.role, id: { not: userId } },
          select: { id: true },
        })
      : null;
    if (taken) {
      throw Object.assign(new Error("Phone number already registered"), {
        code: "PHONE_ALREADY_EXISTS",
        status: 409,
      });
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      phone: data.phone || null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      avatar: true,
    },
  });

  // Refresh the session token so name change is reflected immediately
  const token = signJwt({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    avatar: user.avatar ? getPublicUrl(user.avatar) : null,
  });
  await setSessionCookie(token);

  logger.info({ userId }, "Basic info updated");
  return { ...user, avatar: user.avatar ? getPublicUrl(user.avatar) : null };
}

// ─── Avatar update ────────────────────────────────────────────────────────────

/**
 * Replaces the user's avatar. Deletes the old R2 object if one exists
 * so we don't accumulate orphaned files in the bucket.
 */
export async function updateAvatar(userId: string, newKey: string | null) {
  // Fetch old avatar key before overwriting
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatar: true },
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatar: newKey },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
    },
  });

  // Delete old file from R2 after DB update succeeds
  if (existing?.avatar && existing.avatar !== newKey) {
    await deleteFromStorage(existing.avatar);
  }

  // Refresh session cookie with new avatar URL
  const avatarUrl = user.avatar ? getPublicUrl(user.avatar) : null;
  const token = signJwt({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    avatar: avatarUrl,
  });
  await setSessionCookie(token);

  logger.info({ userId, hadPrevious: Boolean(existing?.avatar) }, "Avatar updated");
  return { ...user, avatar: avatarUrl };
}

// ─── Coach profile update ─────────────────────────────────────────────────────

export async function updateCoachProfile(
  userId: string,
  data: UpdateCoachProfileInput
) {
  // Resolve discipline name to ID
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

  const current = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { disciplineId: true, status: true, discipline: { select: { name: true } } },
  });

  if (!current) {
    throw Object.assign(new Error("Coach profile not found"), { code: "NOT_FOUND", status: 404 });
  }

  // An approved coach switching discipline must be re-reviewed by an admin:
  // their certifications were validated for the previous discipline only.
  // PENDING / REJECTED profiles are left as-is (already awaiting action).
  const reviewRequired =
    current.status === "APPROVED" && current.disciplineId !== discipline.id;

  const profile = await prisma.coachProfile.update({
    where: { userId },
    data: {
      disciplineId: discipline.id,
      ...(reviewRequired ? { status: "PENDING" as const, statusReason: null } : {}),
      bio: data.bio ?? null,
      portfolio: data.portfolio || null,
      rateType: data.rateType ?? "HOUR",
      rateAmount: data.rateAmount ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      country: data.country ?? null,
      experienceYears: data.experienceYears ?? null,
      instagram: data.instagram || null,
      facebook: data.facebook || null,
      tiktok: data.tiktok || null,
      twitter: data.twitter || null,
      youtube: data.youtube || null,
    },
    include: { discipline: true, media: true },
  });

  logger.info(
    { userId, reviewRequired, ...(reviewRequired ? { from: current.disciplineId, to: discipline.id } : {}) },
    reviewRequired ? "Coach discipline changed — back to pending review" : "Coach profile updated"
  );
  return {
    ...profile,
    media: profile.media.map((m) => ({ ...m, url: getPublicUrl(m.url) })),
    reviewRequired,
    previousDiscipline: current.discipline.name,
  };
}

// ─── Prospect → Coach conversion ──────────────────────────────────────────────

/**
 * Converts a PROSPECT account into a COACH account awaiting admin approval,
 * without creating a new user. Keeps the same email, password, avatar and
 * ClientProfile (and therefore past chats) — only the role changes and a
 * PENDING CoachProfile is created. Re-issues the session cookie so the new
 * role takes effect immediately.
 */
export async function becomeCoach(userId: string, data: BecomeCoachInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true, phone: true, coachProfile: { select: { id: true } } },
  });

  if (!user) {
    throw Object.assign(new Error("User not found"), { code: "NOT_FOUND", status: 404 });
  }

  if (user.role !== "PROSPECT" || user.coachProfile) {
    throw Object.assign(new Error("Account is already a coach account"), {
      code: "ALREADY_EXISTS",
      status: 409,
    });
  }

  // Coaches must have a phone number (same rule as coach registration).
  const phone = data.phone?.trim() || user.phone;
  if (!phone) {
    throw Object.assign(new Error("Phone number is required for coach accounts"), {
      code: "PHONE_REQUIRED",
      status: 400,
    });
  }

  // Email/phone are unique per role: once converted, this account must not
  // collide with another *active* COACH account. Admin-deleted coach
  // accounts holding them are released inside the transaction below.
  const coachTwin = await prisma.user.findFirst({
    where: {
      role: "COACH",
      deletedAt: null,
      id: { not: userId },
      OR: [{ email: user.email }, { phone }],
    },
    select: { email: true },
  });
  if (coachTwin) {
    const sameEmail = coachTwin.email === user.email;
    throw Object.assign(
      new Error(
        sameEmail
          ? "A coach account already exists with this email — log in to it instead"
          : "Phone number already registered"
      ),
      { code: sameEmail ? "COACH_ACCOUNT_EXISTS" : "PHONE_ALREADY_EXISTS", status: 409 }
    );
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

  const updated = await prisma.$transaction(async (tx) => {
    await releaseIdentifiersFromDeletedUsers(tx, {
      email: user.email,
      phone,
      role: "COACH",
      exceptUserId: userId,
    });

    await tx.coachProfile.create({
      data: {
        userId,
        disciplineId: discipline.id,
        bio: data.bio || null,
        portfolio: data.portfolio || null,
        status: "PENDING",
      },
    });

    return tx.user.update({
      where: { id: userId },
      data: { role: "COACH", phone },
      select: { id: true, email: true, name: true, role: true, avatar: true },
    });
  });

  // Refresh the session so the new COACH role applies without re-login
  const token = signJwt({
    userId: updated.id,
    role: updated.role,
    email: updated.email,
    name: updated.name,
    avatar: updated.avatar ? getPublicUrl(updated.avatar) : null,
  });
  await setSessionCookie(token);

  logger.info({ userId }, "Prospect converted to coach — pending approval");
  return updated;
}

// ─── Client profile update ────────────────────────────────────────────────────

export async function updateClientProfile(
  userId: string,
  data: UpdateClientProfileInput
) {
  const profile = await prisma.clientProfile.update({
    where: { userId },
    data: {
      ageRange: data.ageRange ?? null,
      heightCm: data.heightCm ?? null,
      weightKg: data.weightKg ?? null,
      goals: data.goals ?? null,
    },
  });

  logger.info({ userId }, "Client profile updated");
  return profile;
}

// ─── Account deletion ─────────────────────────────────────────────────────────

/**
 * Permanently deletes a user account and all associated data.
 * Collects all R2 object keys first, performs the DB deletion in a
 * transaction, then cleans up storage. If storage deletion fails we
 * log for manual cleanup rather than rolling back the DB deletion.
 */
export async function deleteUserAccount(userId: string) {
  // Collect all R2 keys before deletion
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      avatar: true,
      coachProfile: { select: { media: { select: { url: true } } } },
      medias: { select: { url: true } },
    },
  });

  const keysToDelete: string[] = [
    user?.avatar,
    ...(user?.coachProfile?.media.map((m) => m.url) ?? []),
    ...(user?.medias.map((m) => m.url) ?? []),
  ].filter((k): k is string => Boolean(k));

  // Prisma cascade deletes handle all related records automatically
  await prisma.user.delete({ where: { id: userId } });

  logger.info({ userId, filesCount: keysToDelete.length }, "User account deleted");

  // Best-effort storage cleanup — runs after successful DB deletion
  await Promise.allSettled(keysToDelete.map(deleteFromStorage));
}

/**
 * src/services/coach.service.ts
 *
 * Business logic for the public coach directory, admin review workflow,
 * and coach media management.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendMail, getCoachApprovedTemplate, getCoachRejectedTemplate } from "@/lib/mail";
import { logger } from "@/lib/logger";
import { getPublicUrl, deleteFromStorage, validateCoachMediaKey} from "@/lib/storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoachListFilters {
  discipline?: string;
  minRating?: number;
  rateType?: "HOUR" | "WEEK" | "MONTH";
  maxRate?: number;
  limit?: number;
  offset?: number;
}

// ─── Public directory ─────────────────────────────────────────────────────────

/**
 * Lists approved coaches with optional filtering.
 * All media URLs are resolved from R2 keys to public URLs.
 */
export async function listCoaches(filters: CoachListFilters = {}) {
  const {
    discipline,
    minRating,
    rateType,
    maxRate,
    limit = 20,
    offset = 0,
  } = filters;

  const where: Prisma.CoachProfileWhereInput = {
    status: "APPROVED",
    ...(discipline && {
      discipline: { name: { contains: discipline, mode: "insensitive" } },
    }),
    ...(minRating !== undefined && { minRating: { gte: minRating } }),
    ...(rateType && { rateType }),
    ...(maxRate !== undefined && { rateAmount: { lte: maxRate } }),
  };

  const [coaches, total] = await prisma.$transaction([
    prisma.coachProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        discipline: { select: { id: true, name: true, imageUrl: true } },
        media: { take: 5, orderBy: { createdAt: "desc" } },
      },
      take: Math.min(limit, 100),
      skip: offset,
      orderBy: { createdAt: "desc" },
    }),
    prisma.coachProfile.count({ where }),
  ]);

  return {
    coaches: coaches.map(resolveCoachUrls),
    total,
    limit,
    offset,
  };
}

/**
 * Fetches a single approved coach profile by their User UUID.
 */
export async function getPublicCoachProfile(userId: string) {
  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      discipline: true,
      media: true,
    },
  });

  if (!coach || coach.status !== "APPROVED") return null;
  return resolveCoachUrls(coach);
}

// ─── Admin review ─────────────────────────────────────────────────────────────

/**
 * Approves a coach application. Sends approval email.
 * Creates an AdminReview audit record.
 */
export async function approveCoach(coachId: number, adminId: string) {
  const coach = await prisma.coachProfile.findUnique({
    where: { id: coachId },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!coach) {
    throw Object.assign(new Error("Coach not found"), { code: "NOT_FOUND", status: 404 });
  }

  const [updated] = await prisma.$transaction([
    prisma.coachProfile.update({
      where: { id: coachId },
      data: { status: "APPROVED" },
    }),
    prisma.adminReview.create({
      data: { coachId, adminId, action: "APPROVED" },
    }),
  ]);

  sendMail({
    to: coach.user.email,
    subject: "Your Coach Profile is Approved!",
    html: getCoachApprovedTemplate(coach.user.name ?? "Coach"),
  }).catch(() => {});

  logger.info({ coachId, adminId }, "Coach approved");
  return updated;
}

/**
 * Rejects a coach application with a reason. Sends rejection email.
 */
export async function rejectCoach(
  coachId: number,
  adminId: string,
  reason: string
) {
  const coach = await prisma.coachProfile.findUnique({
    where: { id: coachId },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!coach) {
    throw Object.assign(new Error("Coach not found"), { code: "NOT_FOUND", status: 404 });
  }

  const [updated] = await prisma.$transaction([
    prisma.coachProfile.update({
      where: { id: coachId },
      data: { status: "REJECTED", statusReason: reason },
    }),
    prisma.adminReview.create({
      data: { coachId, adminId, action: "REJECTED", comment: reason },
    }),
  ]);

  sendMail({
    to: coach.user.email,
    subject: "Update on Your Coach Application",
    html: getCoachRejectedTemplate(coach.user.name ?? "Coach"),
  }).catch(() => {});

  logger.info({ coachId, adminId }, "Coach rejected");
  return updated;
}

// ─── Media management ─────────────────────────────────────────────────────────

/**
 * Registers a media upload after the client has PUT to the R2 presigned URL.
 * Validates that the key belongs to this coach to prevent cross-user claims.
 */
export async function registerCoachMedia(
  userId: string,
  data: {
    s3Key: string;
    mimeType: string;
    sizeBytes?: number;
    description?: string;
    type: "CERTIFICATE" | "IMAGE" | "VIDEO" | "OTHER";
  }
) {
  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!coachProfile) {
    throw Object.assign(new Error("Coach profile not found"), {
      code: "NOT_FOUND",
      status: 404,
    });
  }

  // Server-side validation: key must belong to this coach's directory
  if (!validateCoachMediaKey(data.s3Key, coachProfile.id)) {
    logger.warn(
      { userId, s3Key: data.s3Key, coachId: coachProfile.id },
      "Invalid S3 key — possible cross-user claim attempt"
    );
    throw Object.assign(new Error("Invalid file key"), {
      code: "FORBIDDEN",
      status: 403,
    });
  }

  const media = await prisma.media.create({
    data: {
      coachId: coachProfile.id,
      ownerId: userId,
      url: data.s3Key,
      type: data.type,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes ?? 0,
      description: data.description,
    },
  });

  return { ...media, url: getPublicUrl(media.url) };
}

/**
 * Deletes a media file — verifies ownership before deletion.
 */
export async function deleteCoachMedia(userId: string, mediaId: number) {
  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!coachProfile) {
    throw Object.assign(new Error("Coach profile not found"), {
      code: "NOT_FOUND",
      status: 404,
    });
  }

  const media = await prisma.media.findUnique({ where: { id: mediaId } });

  if (!media) {
    throw Object.assign(new Error("Media not found"), { code: "NOT_FOUND", status: 404 });
  }

  // Ownership check: media must belong to this coach
  if (media.coachId !== coachProfile.id && media.ownerId !== userId) {
    logger.warn({ userId, mediaId }, "Unauthorised media delete attempt");
    throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN", status: 403 });
  }

  await prisma.media.delete({ where: { id: mediaId } });
  await deleteFromStorage(media.url);

  logger.info({ userId, mediaId }, "Coach media deleted");
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/** Resolves R2 keys to public URLs on a coach record. */
function resolveCoachUrls<T extends {
  user: { avatar: string | null };
  media: Array<{ url: string }>;
}>(coach: T): T {
  return {
    ...coach,
    user: {
      ...coach.user,
      avatar: coach.user.avatar ? getPublicUrl(coach.user.avatar) : null,
    },
    media: coach.media.map((m) => ({ ...m, url: getPublicUrl(m.url) })),
  };
}

/**
 * GET  /api/profile  → fetch own profile
 * PATCH /api/profile  → update own profile (basic info, coach, client, or avatar)
 *
 * The PATCH body is discriminated by which fields are present.
 * We use separate Zod schemas for each update type so validation
 * is precise rather than a single permissive schema.
 */

import { NextResponse, after } from "next/server";
import { requireAuth, type JwtPayload } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sendNotification } from "@/lib/notifications";
import { sendMail, getAdminCoachDisciplineChangedTemplate } from "@/lib/mail/index";
import {
  getUserProfile,
  updateBasicInfo,
  updateCoachProfile,
  updateClientProfile,
  updateAvatar,
} from "@/services/user.service";
import {
  UpdateBasicInfoSchema,
  UpdateCoachProfileSchema,
  UpdateClientProfileSchema,
  UpdateAvatarSchema,
} from "@/lib/validation/schemas";

/**
 * An approved coach changed discipline and is back to PENDING: tell the
 * coach and alert admins so the profile gets re-reviewed. Runs via after()
 * so Vercel does not freeze the function before delivery.
 */
function notifyDisciplineChange(payload: JwtPayload, from: string, to: string) {
  const displayName = payload.name ?? payload.email;
  after(async () => {
    await Promise.allSettled([
      sendNotification({
        userId: payload.userId,
        title: "Profil en cours de revalidation ⏳",
        body: `Vous êtes passé de ${from} à ${to}. Un administrateur doit revalider votre profil avant qu'il soit de nouveau visible.`,
        type: "ACCOUNT_REVIEW",
        url: "/coach/dashboard",
      }),
      sendMail({
        to: env.ADMIN_EMAIL,
        subject: "Coach discipline changed — review required",
        html: getAdminCoachDisciplineChangedTemplate(displayName, payload.email, from, to),
      }),
    ]);

    try {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      await Promise.allSettled(admins.map((admin) => sendNotification({
        userId: admin.id,
        title: "Changement de discipline à valider",
        body: `${displayName} est passé de ${from} à ${to} et attend votre revalidation.`,
        type: "ACCOUNT_REVIEW",
        url: "/admin/coaches",
      })));
    } catch (err) {
      logger.error({ err }, "[PATCH /api/profile] discipline change admin notification failed");
    }
  });
}

export async function GET(req: Request) {
  const payload = await requireAuth(req, { checkCoachStatus: false });
  if (!payload) return NextResponse.json({ success: false }, { status: 401 });

  const result = await getUserProfile(payload.userId);
  if (!result) return NextResponse.json({ success: false }, { status: 404 });

  const { coachProfile, clientProfile, ...user } = result;
  return NextResponse.json({ 
    success: true, 
    user, 
    profile: coachProfile || clientProfile 
  });
}

export async function PATCH(req: Request) {
  const payload = await requireAuth(req, { checkCoachStatus: false });
  if (!payload) return NextResponse.json({ success: false }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_JSON" } },
      { status: 400 }
    );
  }

  let reviewRequired = false;

  try {
    // Discriminate by which fields are present in the body
    if ("avatar" in body) {
      // Avatar update (null = remove)
      const result = UpdateAvatarSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: result.error.errors[0]?.message } },
          { status: 400 }
        );
      }
      await updateAvatar(payload.userId, result.data.avatar);
    } else if ("discipline" in body && payload.role === "COACH") {
      // Coach profile update
      const result = UpdateCoachProfileSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: result.error.errors[0]?.message } },
          { status: 400 }
        );
      }
      const updated = await updateCoachProfile(payload.userId, result.data);
      if (updated.reviewRequired) {
        reviewRequired = true;
        notifyDisciplineChange(payload, updated.previousDiscipline, updated.discipline.name);
      }
    } else if (payload.role === "PROSPECT" && ("ageRange" in body || "goals" in body)) {
      // Client profile update
      const result = UpdateClientProfileSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: result.error.errors[0]?.message } },
          { status: 400 }
        );
      }
      await updateClientProfile(payload.userId, result.data);
    } else {
      // Default: basic info (name + phone)
      const result = UpdateBasicInfoSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: result.error.errors[0]?.message } },
          { status: 400 }
        );
      }
      await updateBasicInfo(payload.userId, result.data);
    }

    // Always return full profile after any successful update
    const profileResult = await getUserProfile(payload.userId);
    if (!profileResult) return NextResponse.json({ success: false }, { status: 404 });

    const { coachProfile, clientProfile, ...user } = profileResult;
    return NextResponse.json({
      success: true,
      user,
      profile: coachProfile || clientProfile,
      ...(reviewRequired ? { reviewRequired: true } : {}),
    });

  } catch (err: unknown) {
    const error = err as { code?: string; message?: string; status?: number };
    return NextResponse.json(
      { success: false, error: { code: error.code ?? "INTERNAL_ERROR", message: error.message } },
      { status: error.status ?? 500 }
    );
  }
}

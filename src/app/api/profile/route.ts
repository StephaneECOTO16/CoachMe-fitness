/**
 * GET  /api/profile  → fetch own profile
 * PATCH /api/profile  → update own profile (basic info, coach, client, or avatar)
 *
 * The PATCH body is discriminated by which fields are present.
 * We use separate Zod schemas for each update type so validation
 * is precise rather than a single permissive schema.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
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
      await updateCoachProfile(payload.userId, result.data);
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
      profile: coachProfile || clientProfile
    });

  } catch (err: unknown) {
    const error = err as { code?: string; message?: string; status?: number };
    return NextResponse.json(
      { success: false, error: { code: error.code ?? "INTERNAL_ERROR", message: error.message } },
      { status: error.status ?? 500 }
    );
  }
}

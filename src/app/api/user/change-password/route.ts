/**
 * Allows an authenticated user to change their password.
 * After a successful change we invalidate ALL outstanding password reset
 * tokens for this user — if the account was compromised and an attacker
 * already requested a reset link, that link is now dead.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, comparePassword, hashPassword } from "@/lib/auth";
import { parseRequestBody, ChangePasswordRequestSchema } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const payload = await requireAuth(req, { checkCoachStatus: false });
  if (!payload) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORISED" } },
      { status: 401 }
    );
  }

  const { data, error } = await parseRequestBody(req, ChangePasswordRequestSchema);
  if (error) {
    return NextResponse.json({ success: false, error }, { status: 400 });
  }

  const { currentPassword, newPassword } = data!;

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { password: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INCORRECT_PASSWORD",
            message: "Current password is incorrect",
          },
        },
        { status: 400 }
      );
    }

    const hashed = await hashPassword(newPassword);

    // Atomic transaction: update password + invalidate all reset tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id: payload.userId },
        data: { password: hashed },
      }),
      // Purge reset tokens — if the account was compromised, any outstanding
      // reset links are now dead even if they haven't expired yet
      prisma.passwordResetToken.updateMany({
        where: { userId: payload.userId, used: false },
        data: { used: true },
      }),
    ]);

    logger.info({ userId: payload.userId }, "Password changed — reset tokens purged");

    return NextResponse.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    logger.error({ err, userId: payload.userId }, "Change password failed");
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}

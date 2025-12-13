/**
 * src/app/api/auth/reset-password/route.ts
 * Handles password reset using a valid token.
 * Validates the token, updates the password, and marks the token as used.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseRequestBody } from "@/lib/schemas";
import bcrypt from "bcryptjs";

const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

/**
 * POST /api/auth/reset-password
 * Reset password using a valid token.
 */
export async function POST(req: Request) {
  // Validate request body
  const { data, error } = await parseRequestBody(req, ResetPasswordSchema);
  if (error) {
    return NextResponse.json({ success: false, error }, { status: 400 });
  }

  const { token, password } = data;

  try {
    // Find the token in the database
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Check if token exists
    if (!resetToken) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_TOKEN", message: "Invalid or expired reset link" },
        },
        { status: 400 }
      );
    }

    // Check if token has been used
    if (resetToken.used) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "TOKEN_USED", message: "This reset link has already been used" },
        },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (new Date() > resetToken.expiresAt) {
      // Mark as used to prevent future attempts
      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      });

      return NextResponse.json(
        {
          success: false,
          error: { code: "TOKEN_EXPIRED", message: "This reset link has expired" },
        },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    console.log(`[Reset Password] Password reset successful for user ID: ${resetToken.userId}`);

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("[POST /api/auth/reset-password] Error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}


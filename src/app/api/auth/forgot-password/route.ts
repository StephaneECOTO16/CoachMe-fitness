/**
 * src/app/api/auth/forgot-password/route.ts
 * Handles password reset requests.
 * Generates a secure token and stores it in the database.
 * In production, this would send an email with the reset link.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseRequestBody } from "@/lib/schemas";
import { randomBytes } from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendMail, getForgotPasswordTemplate } from "@/lib/mail";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * POST /api/auth/forgot-password
 * Request a password reset link.
 * Always returns success to prevent email enumeration attacks.
 */
export async function POST(req: Request) {
  // Validate request body
  const { data, error } = await parseRequestBody(req, ForgotPasswordSchema);
  if (error) {
    return NextResponse.json({ success: false, error }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ success: false, error: { code: "INVALID_REQUEST" } }, { status: 400 });
  }

  const { email } = data;
  const normalizedEmail = email.toLowerCase().trim();

  // Apply rate limiting: 3 requests per email per 15 minutes
  const rateLimitKey = `forgot-password:${normalizedEmail}`;
  const isAllowed = checkRateLimit(rateLimitKey, 3, 15 * 60 * 1000);

  if (!isAllowed) {
    // Still return success to prevent enumeration
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a reset link will be sent.",
    });
  }

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a reset link will be sent.",
      });
    }

    // Invalidate any existing unused tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Generate a secure random token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store the token in the database
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Send email with reset link
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
    await sendMail({
      to: normalizedEmail,
      subject: "Reset Your Password - CoachMe",
      html: getForgotPasswordTemplate(resetUrl),
    });

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a reset link will be sent.",
      // DEV ONLY: Include token in response for testing (remove in production!)
      ...(process.env.NODE_ENV === "development" && { devToken: token }),
    });
  } catch (err) {
    console.error("[POST /api/auth/forgot-password] Error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}

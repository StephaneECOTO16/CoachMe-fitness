/**
 * src/app/api/auth/forgot-password/route.ts
 * Handles password reset requests.
 * Generates a secure token and stores it in the database.
 * In production, this would send an email with the reset link.
 */

import { NextResponse } from "next/server";
import { parseRequestBody, ForgotPasswordSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/rate-limit";
import { initiatePasswordReset } from "@/services/auth.service";


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
  const isAllowed = await checkRateLimit(rateLimitKey, "password-reset");

  if (!isAllowed) {
    // Still return success to prevent enumeration
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a reset link will be sent.",
    });
  }

  try {
    await initiatePasswordReset(normalizedEmail);

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a reset link will be sent.",
    });
  } catch (err) {
    console.error("[POST /api/auth/forgot-password] Error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}

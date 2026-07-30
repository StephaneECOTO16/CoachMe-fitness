/**
 * src/app/api/auth/reset-password/route.ts
 * Handles password reset using a valid token.
 * Validates the token, updates the password, and marks the token as used.
 */

import { NextResponse } from "next/server";
import { parseRequestBody, ResetPasswordSchema } from "@/lib/validation/schemas";
import { completePasswordReset } from "@/services/auth.service";

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

  if (!data) {
    return NextResponse.json({ success: false, error: { code: "INVALID_REQUEST" } }, { status: 400 });
  }

  const { token, password } = data;

  try {
    await completePasswordReset(token, password);

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("[POST /api/auth/reset-password] Error:", err);
    const error = err as { code?: string; status?: number; message?: string };
    if (error.status && error.code) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}

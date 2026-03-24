/**
 * POST /api/auth/logout
 * Clears the session cookie.
 */


import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/index";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}

/**
 * GET /api/admin/mail-check[?send=1]
 *
 * Admin-only SMTP diagnostic. For each configured SMTP account (SMTP_*, then
 * MAIL_*) reports whether the login works and, with ?send=1, whether a real
 * test email to the requesting admin is accepted (catches quota and
 * unverified-sender errors that a login check misses). Never returns secrets.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { checkMailConfigs } from "@/lib/mail/index";

export async function GET(req: Request) {
  const payload = await requireAuth(req, { allowedRoles: ["ADMIN"] });
  if (!payload) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const send = new URL(req.url).searchParams.get("send") === "1";
  const result = await checkMailConfigs(send ? payload.email : undefined);

  return NextResponse.json(
    { success: true, sentTo: send ? payload.email : null, ...result },
    { headers: { "Cache-Control": "no-store" } },
  );
}

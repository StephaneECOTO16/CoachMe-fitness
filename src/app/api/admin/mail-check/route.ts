/**
 * GET /api/admin/mail-check[?send=1[&to=user@example.com]]
 *
 * Admin-only SMTP diagnostic. For each configured SMTP account (SMTP_*, then
 * MAIL_*) reports whether the login works and, with ?send=1, whether a real
 * test email is accepted (catches quota, relay and unverified-sender errors
 * that a login check misses). Never returns secrets.
 *
 * The test email goes to the requesting admin by default. `to` sends it to
 * another address instead (e.g. a Gmail account, to test external delivery);
 * it must belong to a registered user so the endpoint cannot be used to
 * email arbitrary people.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkMailConfigs } from "@/lib/mail/index";

export async function GET(req: Request) {
  const payload = await requireAuth(req, { allowedRoles: ["ADMIN"] });
  if (!payload) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const send = params.get("send") === "1";
  const requestedTo = params.get("to")?.trim().toLowerCase();

  let sendTo: string | undefined;
  if (send) {
    sendTo = payload.email;
    if (requestedTo && requestedTo !== payload.email.toLowerCase()) {
      const user = await prisma.user.findFirst({
        where: { email: requestedTo },
        select: { id: true },
      });
      if (!user) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "UNKNOWN_RECIPIENT",
              message: "`to` must be the email of a registered user",
            },
          },
          { status: 400 },
        );
      }
      sendTo = requestedTo;
    }
  }

  const result = await checkMailConfigs(sendTo);

  return NextResponse.json(
    { success: true, sentTo: sendTo ?? null, ...result },
    { headers: { "Cache-Control": "no-store" } },
  );
}

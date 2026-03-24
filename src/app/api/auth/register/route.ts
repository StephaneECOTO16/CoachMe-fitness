/**
 * POST /api/auth/register
 * Thin handler — delegates entirely to auth.service.
 */

import { NextResponse } from "next/server";
import { parseRequestBody, RegisterRequestSchema } from "@/lib/validation/schemas";
import { registerProspect, registerCoach } from "@/services/auth.service";
import { checkRateLimit, getRealIp } from "@/lib/rate-limit";


export async function POST(req: Request) {
  const ip = getRealIp(req);
  if (!(await checkRateLimit(`register:${ip}`, "register"))) {
    return NextResponse.json(
      { success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests." } },
      { status: 429 }
    );
  }

  const { data, error } = await parseRequestBody(req, RegisterRequestSchema);
  if (error) return NextResponse.json({ success: false, error }, { status: 400 });

  try {
    let user;
    if (data!.accountType === "PROSPECT") {
      user = await registerProspect(data as any); // Cast is still needed due to discriminated union handling in this specific pattern, but removing 'any' where possible.
    } else {
      user = await registerCoach(data as any);
    }
 
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: err.code ?? "INTERNAL_ERROR", message: err.message } },
      { status: err.status ?? 500 }
    );
  }
}

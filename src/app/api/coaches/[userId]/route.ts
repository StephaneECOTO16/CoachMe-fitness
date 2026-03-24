import { NextResponse } from "next/server";
import { getPublicCoachProfile } from "@/services/coach.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  // Validate format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return NextResponse.json({ 
      success: false, 
      error: { code: "INVALID_FORMAT", message: "Invalid User UUID" } 
    }, { status: 400 });
  }

  const coach = await getPublicCoachProfile(userId);
  if (!coach) {
    return NextResponse.json({ 
      success: false, 
      error: { code: "NOT_FOUND", message: "Coach not found" } 
    }, { status: 404 });
  }

  return NextResponse.json({ success: true, coach });
}

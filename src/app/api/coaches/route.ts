// src/app/api/coaches/route.ts

import { NextResponse } from "next/server";
import { listCoaches } from "@/services/coach.service";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const filters = {
    discipline: url.searchParams.get("discipline") ?? undefined,
    minRating: url.searchParams.get("minRating")
      ? parseFloat(url.searchParams.get("minRating")!)
      : undefined,
    rateType: url.searchParams.get("rateType") as "HOUR" | "WEEK" | "MONTH" | undefined,
    maxRate: url.searchParams.get("maxRate")
      ? parseFloat(url.searchParams.get("maxRate")!)
      : undefined,
    limit: Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100),
    offset: parseInt(url.searchParams.get("offset") ?? "0"),
  };

  const result = await listCoaches(filters);
  return NextResponse.json({ success: true, ...result });
}

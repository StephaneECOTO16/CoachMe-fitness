import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listUsers } from "@/services/admin.service";

export async function GET(req: Request) {
  const payload = await requireAuth(req, { allowedRoles: ["ADMIN"] });
  if (!payload) return NextResponse.json({ success: false }, { status: 401 });

  const url = new URL(req.url);
  const result = await listUsers({
    search: url.searchParams.get("search") ?? "",
    page: parseInt(url.searchParams.get("page") ?? "1"),
    limit: Math.min(parseInt(url.searchParams.get("limit") ?? "25"), 100),
  });

  return NextResponse.json({ success: true, ...result });
}

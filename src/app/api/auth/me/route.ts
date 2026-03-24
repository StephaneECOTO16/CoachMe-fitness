/**
 * Session hydration endpoint.
 * The browser sends the HttpOnly session cookie automatically.
 * We verify it and return the user's public identity claims.
 *
 * The AuthContext calls this on mount instead of reading localStorage.
 * This is the secure pattern — the JWT never touches client JS.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPublicUrl } from "@/lib/storage";

export async function GET(req: Request) {
  // No role restriction — any authenticated user can hydrate their session
  const payload = await requireAuth(req, { checkCoachStatus: false });

  if (!payload) {
    // 401 with an empty body — the client interprets this as "not logged in"
    return NextResponse.json(
      { success: false, user: null },
      { status: 401 }
    );
  }

  // Re-fetch fresh user data from DB so the client always gets
  // up-to-date name / avatar even if the cookie is slightly stale
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      avatar: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, user: null },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      ...user,
      // Resolve R2 key to full public URL for the client
      avatar: user.avatar ? getPublicUrl(user.avatar) : null,
    },
  });
}

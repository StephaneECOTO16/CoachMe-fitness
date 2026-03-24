import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getOrCreateChat,
  getCoachChats,
  getClientChats,
  getAllChats,
} from "@/services/chat.service";
import { parseRequestBody, InitiateChatSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  const payload = await requireAuth(req, { allowedRoles: ["PROSPECT"] });
  if (!payload) return NextResponse.json({ success: false }, { status: 401 });

  const { data, error } = await parseRequestBody(req, InitiateChatSchema);
  if (error) return NextResponse.json({ success: false, error }, { status: 400 });

  try {
    const chat = await getOrCreateChat(payload.userId, data!.coachId);
    return NextResponse.json({ success: true, chat });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: err.code ?? "INTERNAL_ERROR", message: err.message } },
      { status: err.status ?? 500 }
    );
  }
}

export async function GET(req: Request) {
  const payload = await requireAuth(req, { checkCoachStatus: false });
  if (!payload) return NextResponse.json({ success: false }, { status: 401 });

  const url = new URL(req.url);

  if (payload.role === "COACH") {
    const chats = await getCoachChats(payload.userId);
    return NextResponse.json({ success: true, chats });
  }

  if (payload.role === "PROSPECT") {
    const chats = await getClientChats(payload.userId);
    return NextResponse.json({ success: true, chats });
  }

  if (payload.role === "ADMIN") {
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") ?? "0");
    const result = await getAllChats(limit, offset);
    return NextResponse.json({ success: true, ...result });
  }

  return NextResponse.json({ success: true, chats: [] });
}

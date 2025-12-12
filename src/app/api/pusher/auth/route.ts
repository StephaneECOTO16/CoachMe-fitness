/**
 * src/app/api/pusher/auth/route.ts
 * Pusher authentication endpoint for private channels.
 * Validates that the user is a participant in the chat they're trying to subscribe to.
 */

import { NextResponse } from "next/server";
import { pusher } from "@/lib/pusher";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  // Verify user is authenticated
  const payload = requireAuth(req);
  if (!payload) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const formData = await req.formData();
    const socketId = formData.get("socket_id") as string;
    const channelName = formData.get("channel_name") as string;

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 }
      );
    }

    // Parse channel name to extract profile IDs
    // Format: private-chat-{minProfileId}-{maxProfileId}
    const channelMatch = channelName.match(/^private-chat-(\d+)-(\d+)$/);
    if (!channelMatch) {
      return NextResponse.json(
        { error: "Invalid channel name format" },
        { status: 400 }
      );
    }

    const profileId1 = parseInt(channelMatch[1]);
    const profileId2 = parseInt(channelMatch[2]);

    // Get user's profile ID based on their role
    let userProfileId: number | null = null;

    if (payload.role === "COACH") {
      const coachProfile = await prisma.coachProfile.findUnique({
        where: { userId: payload.userId },
        select: { id: true },
      });
      userProfileId = coachProfile?.id ?? null;
    } else if (payload.role === "PROSPECT") {
      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: payload.userId },
        select: { id: true },
      });
      userProfileId = clientProfile?.id ?? null;
    }

    // Verify user is a participant in this chat channel
    if (userProfileId !== profileId1 && userProfileId !== profileId2) {
      console.warn(
        `[Pusher Auth] User ${payload.userId} (profile ${userProfileId}) tried to access channel ${channelName}`
      );
      return NextResponse.json(
        { error: "Not authorized for this channel" },
        { status: 403 }
      );
    }

    // Generate Pusher auth response
    const authResponse = pusher.authorizeChannel(socketId, channelName);

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("[POST /api/pusher/auth] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


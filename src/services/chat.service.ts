/**
 *
 * Business logic for chat initiation and message handling.
 * Pusher broadcast and email notification are triggered here,
 * not in route handlers.
 */

import { prisma } from "@/lib/db";
import { broadcastMessage } from "@/lib/pusher";
import { sendMail, getNewMessageTemplate } from "@/lib/mail";
import { sendMail as _sendMail } from "@/lib/mail";
import { logger } from "@/lib/logger";
import { getPublicUrl } from "@/lib/storage";

// ─── Chat initiation ──────────────────────────────────────────────────────────

/**
 * Creates or retrieves the existing 1:1 chat between a client and a coach.
 * Only PROSPECT users can initiate chats — enforced here and at the route level.
 */
export async function getOrCreateChat(prospectUserId: string, coachProfileId: number) {
  const clientProfile = await prisma.clientProfile.findUnique({
    where: { userId: prospectUserId },
    select: { id: true },
  });

  if (!clientProfile) {
    throw Object.assign(new Error("Client profile not found"), {
      code: "NOT_FOUND",
      status: 404,
    });
  }

  const coach = await prisma.coachProfile.findUnique({
    where: { id: coachProfileId },
    select: { id: true, status: true },
  });

  if (!coach) {
    throw Object.assign(new Error("Coach not found"), { code: "NOT_FOUND", status: 404 });
  }

  if (coach.status !== "APPROVED") {
    throw Object.assign(new Error("Coach is not available"), {
      code: "FORBIDDEN",
      status: 403,
    });
  }

  // findOrCreate pattern using upsert isn't available for non-unique combos,
  // so we use findFirst then create — the @@unique constraint prevents duplicates
  const existing = await prisma.chat.findFirst({
    where: { coachId: coachProfileId, clientId: clientProfile.id },
    include: chatInclude,
  });

  if (existing) return resolveAvatars(existing);

  const created = await prisma.chat.create({
    data: { coachId: coachProfileId, clientId: clientProfile.id },
    include: chatInclude,
  });

  logger.info(
    { coachId: coachProfileId, clientId: clientProfile.id },
    "Chat created"
  );

  return resolveAvatars(created);
}

// ─── Message sending ──────────────────────────────────────────────────────────

/**
 * Sends a message in a chat.
 * Verifies the sender is a participant, stores the message,
 * broadcasts via Pusher, and sends an email notification.
 */
export async function sendMessage(
  chatId: number,
  senderUserId: string,
  content: string
) {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      coach: { include: { user: { select: { id: true, email: true, name: true } } } },
      client: { include: { user: { select: { id: true, email: true, name: true } } } },
    },
  });

  if (!chat) {
    throw Object.assign(new Error("Chat not found"), { code: "NOT_FOUND", status: 404 });
  }

  const isCoach = chat.coach.user.id === senderUserId;
  const isClient = chat.client.user.id === senderUserId;

  if (!isCoach && !isClient) {
    throw Object.assign(new Error("Not a participant"), { code: "FORBIDDEN", status: 403 });
  }

  const message = await prisma.message.create({
    data: { chatId, senderId: senderUserId, content: content.trim() },
    include: {
      sender: { select: { id: true, name: true, email: true, role: true, avatar: true } },
    },
  });

  const messageWithUrl = {
    ...message,
    sender: {
      ...message.sender,
      avatar: message.sender.avatar ? getPublicUrl(message.sender.avatar) : null,
    },
  };

  // Real-time broadcast — non-fatal if Pusher is unavailable
  broadcastMessage(chat.coachId, chat.clientId, "new-message", {
    message: messageWithUrl,
  }).catch((err) =>
    logger.error({ err, chatId }, "Pusher broadcast failed")
  );

  // Email notification to the other participant
  const recipient = isCoach ? chat.client.user : chat.coach.user;
  sendMail({
    to: recipient.email,
    subject: `New message from ${message.sender.name ?? "CoachMe User"}`,
    html: getNewMessageTemplate(
      message.sender.name ?? "CoachMe User",
      content.trim()
    ),
  }).catch(() => {});

  return messageWithUrl;
}

// ─── Chat lists ───────────────────────────────────────────────────────────────

/** Returns all chats for a coach user. */
export async function getCoachChats(userId: string) {
  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!coach) return [];

  const chats = await prisma.chat.findMany({
    where: { coachId: coach.id },
    include: {
      ...chatInclude,
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return chats.map(resolveAvatars);
}

/** Returns all chats for a prospect/client user. */
export async function getClientChats(userId: string) {
  const client = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!client) return [];

  const chats = await prisma.chat.findMany({
    where: { clientId: client.id },
    include: {
      ...chatInclude,
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return chats.map(resolveAvatars);
}

/** Returns all chats (admin view) with pagination. */
export async function getAllChats(limit = 50, offset = 0) {
  const [chats, total] = await prisma.$transaction([
    prisma.chat.findMany({
      include: {
        ...chatInclude,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.chat.count(),
  ]);

  return {
    chats: chats.map((c) => ({
      ...resolveAvatars(c),
      lastMessage: c.messages[0]?.content ?? null,
    })),
    total,
  };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

const chatInclude = {
  coach: {
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      discipline: { select: { id: true, name: true } },
    },
  },
  client: {
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  },
} as const;

function resolveAvatars<T extends {
  coach: { user: { avatar: string | null } };
  client: { user: { avatar: string | null } };
}>(chat: T): T {
  return {
    ...chat,
    coach: {
      ...chat.coach,
      user: {
        ...chat.coach.user,
        avatar: chat.coach.user.avatar ? getPublicUrl(chat.coach.user.avatar) : null,
      },
    },
    client: {
      ...chat.client,
      user: {
        ...chat.client.user,
        avatar: chat.client.user.avatar ? getPublicUrl(chat.client.user.avatar) : null,
      },
    },
  };
}

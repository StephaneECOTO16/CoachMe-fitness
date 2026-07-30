import { NextResponse, after } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { broadcastMessage } from '@/lib/pusher';
import { getPublicUrl } from '@/lib/storage';
import { sendMail, getNewMessageTemplate } from '@/lib/mail';
import { sendNotification } from '@/lib/notifications';

/**
 * POST /api/chat/[chatId]/messages
 * Send a message in a chat.
 * Only participants (coach or prospect) can send messages.
 * Broadcasts the message via Pusher for real-time delivery.
 */
export async function POST(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const { chatId: chatIdParam } = await params;
    const chatId = parseInt(chatIdParam);
    if (isNaN(chatId)) return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT' } }, { status: 400 });

    const { content, replyToId } = await req.json();
    if (!content || !content.trim()) {
        return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Message content required' } }, { status: 400 });
    }

    try {
        // Verify chat exists and user is a participant
        const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            include: { client: { include: { user: true } }, coach: { include: { user: true } } },
        });

        if (!chat) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

        const isCoach = chat.coach.userId === payload.userId;
        const isClient = chat.client.userId === payload.userId;

        if (!isCoach && !isClient) {
            return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Not a participant in this chat' } }, { status: 403 });
        }

        let replyTargetId: number | null = null;
        if (replyToId !== undefined && replyToId !== null) {
            replyTargetId = Number(replyToId);
            if (!Number.isInteger(replyTargetId) || replyTargetId <= 0) {
                return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Invalid reply target' } }, { status: 400 });
            }

            const replyTarget = await prisma.message.findFirst({
                where: { id: replyTargetId, chatId },
                select: { id: true },
            });
            if (!replyTarget) {
                return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Reply target not found' } }, { status: 404 });
            }
        }

        // Create message and bump the chat's updatedAt in one transaction —
        // conversation lists sort/display by this, so it must reflect the
        // latest message, not just chat creation time.
        const [message] = await prisma.$transaction([
            prisma.message.create({
                data: {
                    chatId,
                    senderId: payload.userId,
                    content: content.trim(),
                    replyToId: replyTargetId,
                },
                include: {
                    sender: { select: { id: true, name: true, email: true, role: true, avatar: true } },
                    replyTo: { select: { id: true, content: true, sender: { select: { name: true } } } },
                }
            }),
            prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } }),
        ]);

        const messageWithAvatar = {
            ...message,
            sender: {
                ...message.sender,
                avatar: message.sender.avatar ? getPublicUrl(message.sender.avatar) : null,
            },
        };

        // Broadcast message via Pusher for real-time delivery
        // Using coachId and clientId (profile IDs) for consistent channel naming
        try {
            await broadcastMessage(chat.coachId, chat.clientId, 'new-message', { message: messageWithAvatar });
        } catch (pusherError) {
            // Log but don't fail the request if Pusher broadcast fails
            // The message is already saved, recipient can still see it on refresh
            console.error('[POST /api/chat/:chatId/messages] Pusher broadcast error:', pusherError);
        }

        // Send email + push notification after the response is sent.
        // Wrapped in after() rather than left as a bare un-awaited call:
        // Vercel can freeze the function the instant the response below
        // is returned, which would silently drop these before they run.
        const recipient = isCoach ? chat.client.user : chat.coach.user;
        after(async () => {
            if (recipient.email) {
                await sendMail({
                    to: recipient.email,
                    subject: `New message from ${message.sender.name || 'CoachMe User'}`,
                    html: getNewMessageTemplate(message.sender.name || 'CoachMe User', content.trim()),
                }).catch((err) => console.error('[POST /api/chat/:chatId/messages] sendMail failed:', err));
            }

            await sendNotification({
                userId: recipient.id,
                title: `Nouveau message de ${message.sender.name || 'Coach'}`,
                body: content.trim(),
                type: 'CHAT',
                url: `/messages/${chatId}`
            });
        });

        return NextResponse.json({ success: true, message: messageWithAvatar });
    } catch (err: unknown) {
        console.error('[POST /api/chat/:chatId/messages]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

/**
 * DELETE /api/chat/[chatId]/messages
 * Delete one or more messages owned by the authenticated participant.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const { chatId: chatIdParam } = await params;
    const chatId = parseInt(chatIdParam);
    if (isNaN(chatId)) return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT' } }, { status: 400 });

    try {
        const body = await req.json();
        const rawIds: unknown[] = Array.isArray(body.messageIds) ? body.messageIds : [body.messageId];
        const messageIds: number[] = [...new Set(
            rawIds
                .map((id: unknown) => Number(id))
                .filter((id: number): id is number => Number.isInteger(id) && id > 0)
        )];

        if (messageIds.length === 0 || messageIds.length > 100) {
            return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Select between 1 and 100 messages' } }, { status: 400 });
        }

        const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            include: { client: true, coach: true },
        });
        if (!chat) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

        const isParticipant = chat.coach.userId === payload.userId || chat.client.userId === payload.userId;
        if (!isParticipant) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });

        const ownedMessages = await prisma.message.findMany({
            where: { id: { in: messageIds }, chatId, senderId: payload.userId },
            select: { id: true },
        });
        if (ownedMessages.length !== messageIds.length) {
            return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only delete your own messages' } }, { status: 403 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.message.deleteMany({ where: { id: { in: messageIds }, chatId, senderId: payload.userId } });
            const latestMessage = await tx.message.findFirst({ where: { chatId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
            await tx.chat.update({ where: { id: chatId }, data: { updatedAt: latestMessage?.createdAt ?? new Date() } });
        });

        try {
            await broadcastMessage(chat.coachId, chat.clientId, 'deleted-messages', { messageIds });
        } catch (pusherError) {
            console.error('[DELETE /api/chat/:chatId/messages] Pusher broadcast error:', pusherError);
        }

        return NextResponse.json({ success: true, messageIds });
    } catch (err: unknown) {
        console.error('[DELETE /api/chat/:chatId/messages]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

/**
 * GET /api/chat/[chatId]/messages
 * Fetch message history for a chat.
 * Paginated for performance.
 */
export async function GET(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const { chatId: chatIdParam } = await params;
    const chatId = parseInt(chatIdParam);
    if (isNaN(chatId)) return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT' } }, { status: 400 });

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    try {
        // Verify chat exists and user is a participant
        const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            include: { client: true, coach: true },
        });

        if (!chat) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

        const isCoach = chat.coach.userId === payload.userId;
        const isClient = chat.client.userId === payload.userId;
        const isAdmin = payload.role === 'ADMIN';

        if (!isCoach && !isClient && !isAdmin) {
            return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
        }

        // Fetch messages
        const messages = await prisma.message.findMany({
            where: { chatId },
            include: {
                sender: { select: { id: true, name: true, email: true, avatar: true } },
                replyTo: { select: { id: true, content: true, sender: { select: { name: true } } } },
            },
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
        });

        const total = await prisma.message.count({ where: { chatId } });

        // The other participant is now viewing this conversation — mark
        // their unread messages as read so the conversation list badge clears.
        if (isCoach || isClient) {
            await prisma.message.updateMany({
                where: { chatId, senderId: { not: payload.userId }, isRead: false },
                data: { isRead: true },
            });
        }

        const messagesWithAvatars = messages
            .reverse()
            .map((m) => ({
                ...m,
                sender: {
                    ...m.sender,
                    avatar: m.sender.avatar ? getPublicUrl(m.sender.avatar) : null,
                },
            }));

        return NextResponse.json({ success: true, messages: messagesWithAvatars, total, limit, offset });
    } catch (err: unknown) {
        console.error('[GET /api/chat/:chatId/messages]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

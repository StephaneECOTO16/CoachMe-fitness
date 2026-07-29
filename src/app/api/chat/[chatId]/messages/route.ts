import { NextResponse } from 'next/server';
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

    const { content } = await req.json();
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

        // Create message and bump the chat's updatedAt in one transaction —
        // conversation lists sort/display by this, so it must reflect the
        // latest message, not just chat creation time.
        const [message] = await prisma.$transaction([
            prisma.message.create({
                data: {
                    chatId,
                    senderId: payload.userId,
                    content: content.trim(),
                },
                include: {
                    sender: { select: { id: true, name: true, email: true, role: true, avatar: true } }
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

        // Send Email Notification (Non-blocking)
        const recipient = isCoach ? chat.client.user : chat.coach.user;
        if (recipient.email) {
            sendMail({
                to: recipient.email,
                subject: `New message from ${message.sender.name || 'CoachMe User'}`,
                html: getNewMessageTemplate(message.sender.name || 'CoachMe User', content.trim()),
            });
        }

        // Send Push Notification (Non-blocking)
        sendNotification({
            userId: recipient.id,
            title: `Nouveau message de ${message.sender.name || 'Coach'}`,
            body: content.trim(),
            type: 'CHAT',
            url: `/messages/${chatId}`
        });

        return NextResponse.json({ success: true, message: messageWithAvatar });
    } catch (err: unknown) {
        console.error('[POST /api/chat/:chatId/messages]', err);
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
            include: { sender: { select: { id: true, name: true, email: true, avatar: true } } },
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

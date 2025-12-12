import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { broadcastMessage } from '@/lib/pusher';

/**
 * POST /api/chat/[chatId]/messages
 * Send a message in a chat.
 * Only participants (coach or prospect) can send messages.
 * Broadcasts the message via Pusher for real-time delivery.
 */
export async function POST(req: Request, { params }: { params: { chatId: string } }) {
    const payload = requireAuth(req);
    if (!payload) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const chatId = parseInt(params.chatId);
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

        // Create message in database
        const message = await prisma.message.create({
            data: {
                chatId,
                senderId: payload.userId,
                content: content.trim(),
            },
            include: {
                sender: { select: { id: true, name: true, email: true, role: true } }
            }
        });

        // Broadcast message via Pusher for real-time delivery
        // Using coachId and clientId (profile IDs) for consistent channel naming
        try {
            await broadcastMessage(chat.coachId, chat.clientId, 'new-message', { message });
        } catch (pusherError) {
            // Log but don't fail the request if Pusher broadcast fails
            // The message is already saved, recipient can still see it on refresh
            console.error('[POST /api/chat/:chatId/messages] Pusher broadcast error:', pusherError);
        }

        return NextResponse.json({ success: true, message });
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
export async function GET(req: Request, { params }: { params: { chatId: string } }) {
    const payload = requireAuth(req);
    if (!payload) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const chatId = parseInt(params.chatId);
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

        if (!isCoach && !isClient) {
            return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
        }

        // Fetch messages
        const messages = await prisma.message.findMany({
            where: { chatId },
            include: { sender: { select: { id: true, name: true, email: true } } },
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
        });

        const total = await prisma.message.count({ where: { chatId } });

        return NextResponse.json({ success: true, messages: messages.reverse(), total, limit, offset });
    } catch (err: unknown) {
        console.error('[GET /api/chat/:chatId/messages]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

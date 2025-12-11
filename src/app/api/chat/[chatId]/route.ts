import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/chat/[chatId]
 * Fetch a specific chat with its messages and participants.
 * Only participants (coach or prospect) can access.
 */
export async function GET(req: Request, { params }: { params: { chatId: string } }) {
    const payload = requireAuth(req);
    if (!payload) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const chatId = parseInt(params.chatId);
    if (isNaN(chatId)) return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT' } }, { status: 400 });

    try {
        // Fetch chat with participants and messages
        const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            include: {
                client: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                },
                coach: {
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                    }
                },
                messages: {
                    include: {
                        sender: { select: { id: true, name: true, email: true, role: true } }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!chat) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

        // Verify user is a participant
        const isCoach = chat.coach.userId === payload.userId;
        const isClient = chat.client.userId === payload.userId;

        if (!isCoach && !isClient) {
            return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Not a participant in this chat' } }, { status: 403 });
        }

        return NextResponse.json({ success: true, chat });
    } catch (err: unknown) {
        console.error('[GET /api/chat/:chatId]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

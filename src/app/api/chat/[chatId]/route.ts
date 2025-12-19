import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getPublicUrl } from '@/lib/aws-s3';

/**
 * GET /api/chat/[chatId]
 * Fetch a specific chat with its messages and participants.
 * Only participants (coach or prospect) can access.
 */
export async function GET(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const { chatId: chatIdParam } = await params;
    const chatId = parseInt(chatIdParam);
    if (isNaN(chatId)) return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT' } }, { status: 400 });

    try {
        // Fetch chat with participants and messages
        const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            include: {
                client: {
                    include: {
                        user: { select: { id: true, name: true, email: true, avatar: true } }
                    }
                },
                coach: {
                    include: {
                        user: { select: { id: true, name: true, email: true, avatar: true } },
                        discipline: { select: { id: true, name: true, imageUrl: true } },
                    }
                },
                messages: {
                    include: {
                        sender: { select: { id: true, name: true, email: true, role: true, avatar: true } }
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

        const chatWithAvatars = {
            ...chat,
            client: {
                ...chat.client,
                user: {
                    ...chat.client.user,
                    avatar: chat.client.user.avatar ? getPublicUrl(chat.client.user.avatar) : null,
                },
            },
            coach: {
                ...chat.coach,
                user: {
                    ...chat.coach.user,
                    avatar: chat.coach.user.avatar ? getPublicUrl(chat.coach.user.avatar) : null,
                },
            },
            messages: chat.messages.map((m) => ({
                ...m,
                sender: {
                    ...m.sender,
                    avatar: m.sender.avatar ? getPublicUrl(m.sender.avatar) : null,
                },
            })),
        };

        return NextResponse.json({ success: true, chat: chatWithAvatars });
    } catch (err: unknown) {
        console.error('[GET /api/chat/:chatId]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

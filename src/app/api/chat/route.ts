import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { parseRequestBody, InitiateChatRequestSchema } from '@/lib/schemas';

/**
 * POST /api/chat
 * Initiate a new 1:1 chat between a prospect and a coach.
 * Creates a Chat record if not already exists.
 */
export async function POST(req: Request) {
    // Validate authentication
    const payload = requireAuth(req, ['PROSPECT']);
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        }, { status: 401 });
    }

    // Validate request body using Zod schema
    const { data, error } = await parseRequestBody(req, InitiateChatRequestSchema);
    if (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const { coachId } = data;

    try {
        // Get prospect profile
        const clientProfile = await prisma.clientProfile.findUnique({ where: { userId: payload.userId } });
        if (!clientProfile) {
            return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Prospect profile not found' } }, { status: 404 });
        }

        // Verify coach exists and is approved
        const coach = await prisma.coachProfile.findUnique({ where: { id: coachId } });
        if (!coach) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Coach not found' } }, { status: 404 });
        if (coach.status !== 'APPROVED') {
            return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Coach not available' } }, { status: 403 });
        }

        // Find or create chat
        let chat = await prisma.chat.findFirst({
            where: { coachId, clientId: clientProfile.id },
        });

        if (!chat) {
            chat = await prisma.chat.create({
                data: { coachId, clientId: clientProfile.id },
            });
        }

        return NextResponse.json({ success: true, chat });
    } catch (err: unknown) {
        console.error('[POST /api/chat/initiate]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

/**
 * GET /api/chat
 * List all chats for the authenticated user.
 * Shows coach chats if user is a coach, prospect chats if prospect.
 */
export async function GET(req: Request) {
    const payload = requireAuth(req);
    if (!payload) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    try {
        let chats;

        if (payload.role === 'COACH') {
            const coachProfile = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
            if (!coachProfile) {
                return NextResponse.json({ success: true, chats: [] });
            }
            chats = await prisma.chat.findMany({
                where: { coachId: coachProfile.id },
                include: {
                    client: { include: { user: { select: { id: true, name: true, email: true } } } },
                    _count: { select: { messages: true } }
                },
                orderBy: { updatedAt: 'desc' },
            });
        } else if (payload.role === 'PROSPECT') {
            const clientProfile = await prisma.clientProfile.findUnique({ where: { userId: payload.userId } });
            if (!clientProfile) {
                return NextResponse.json({ success: true, chats: [] });
            }
            chats = await prisma.chat.findMany({
                where: { clientId: clientProfile.id },
                include: {
                    coach: { include: { user: { select: { id: true, name: true, email: true } } } },
                    _count: { select: { messages: true } }
                },
                orderBy: { updatedAt: 'desc' },
            });
        } else {
            // Admin cannot see chats (for now)
            chats = [];
        }

        return NextResponse.json({ success: true, chats });
    } catch (err: unknown) {
        console.error('[GET /api/chat]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

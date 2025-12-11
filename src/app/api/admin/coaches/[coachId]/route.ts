import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/admin/coaches/[coachId]
 * Get detailed information about a specific coach (admin only).
 */
export async function GET(req: Request, { params }: { params: { coachId: string } }) {
    const payload = requireAuth(req, ['ADMIN']);
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Admin access required' }
        }, { status: 401 });
    }

    const coachId = parseInt(params.coachId);
    if (isNaN(coachId)) {
        return NextResponse.json({
            success: false,
            error: { code: 'INVALID_INPUT' }
        }, { status: 400 });
    }

    try {
        const coach = await prisma.coachProfile.findUnique({
            where: { id: coachId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        createdAt: true,
                    }
                },
                media: true,
                chats: {
                    include: {
                        client: {
                            include: {
                                user: { select: { id: true, name: true, email: true } }
                            }
                        }
                    }
                }
            }
        });

        if (!coach) {
            return NextResponse.json({
                success: false,
                error: { code: 'NOT_FOUND' }
            }, { status: 404 });
        }

        return NextResponse.json({ success: true, coach });
    } catch (err: unknown) {
        console.error('[GET /api/admin/coaches/:coachId]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR' }
        }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/coaches/[coachId]
 * Update coach status (approve/reject) (admin only).
 */
export async function PATCH(req: Request, { params }: { params: { coachId: string } }) {
    const payload = requireAuth(req, ['ADMIN']);
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Admin access required' }
        }, { status: 401 });
    }

    const coachId = parseInt(params.coachId);
    if (isNaN(coachId)) {
        return NextResponse.json({
            success: false,
            error: { code: 'INVALID_INPUT' }
        }, { status: 400 });
    }

    try {
        const { status, reason } = await req.json();

        if (!status || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
            return NextResponse.json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'Valid status required (APPROVED, REJECTED, PENDING)' }
            }, { status: 400 });
        }

        const coach = await prisma.coachProfile.update({
            where: { id: coachId },
            data: { status },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            }
        });

        // TODO: Send email notification to coach about status change
        // if (status === 'APPROVED') {
        //   await sendApprovalEmail(coach.user.email, coach.user.name);
        // } else if (status === 'REJECTED') {
        //   await sendRejectionEmail(coach.user.email, coach.user.name, reason);
        // }

        return NextResponse.json({ success: true, coach });
    } catch (err: unknown) {
        console.error('[PATCH /api/admin/coaches/:coachId]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR' }
        }, { status: 500 });
    }
}

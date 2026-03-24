import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getPublicUrl } from '@/lib/storage';

/**
 * GET /api/admin/coaches/[userId]
 * Get detailed information about a specific coach (admin only).
 */
export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    const payload = await requireAuth(req, { allowedRoles: ['ADMIN'] });
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Admin access required' }
        }, { status: 401 });
    }

    const { userId } = await params;

    try {
        const coach = await prisma.coachProfile.findUnique({
            where: { userId: userId }, // Query by unique User UUID
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        avatar: true,
                        createdAt: true,
                    }
                },
                media: true,
                discipline: true,
                chatsAsCoach: {
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

        const coachWithUrls = {
            ...coach,
            user: {
                ...coach.user,
                avatar: coach.user.avatar ? getPublicUrl(coach.user.avatar) : null,
            },
            media: coach.media.map(m => ({
                ...m,
                url: getPublicUrl(m.url)
            })),
            discipline: coach.discipline.name,
        };

        return NextResponse.json({ success: true, coach: coachWithUrls });
    } catch (err: unknown) {
        console.error('[GET /api/admin/coaches/:userId]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR' }
        }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/coaches/[userId]
 * Update coach status (approve/reject) (admin only).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    const payload = await requireAuth(req, { allowedRoles: ['ADMIN'] });
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Admin access required' }
        }, { status: 401 });
    }

    const { userId } = await params;

    try {
        const { status } = await req.json();

        if (!status || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
            return NextResponse.json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'Valid status required (APPROVED, REJECTED, PENDING)' }
            }, { status: 400 });
        }

        const coach = await prisma.coachProfile.update({
            where: { userId: userId }, // Update by unique User UUID
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

        return NextResponse.json({ success: true, coach });
    } catch (err: unknown) {
        console.error('[PATCH /api/admin/coaches/:userId]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR' }
        }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getPublicUrl } from '@/lib/aws-s3';

/**
 * GET /api/admin/coaches
 * Get all coaches or filter by status (admin only).
 * Query params: status (PENDING, APPROVED, REJECTED)
 */
export async function GET(req: Request) {
    const payload = await requireAuth(req, ['ADMIN']);
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Admin access required' }
        }, { status: 401 });
    }

    try {
        const url = new URL(req.url);
        const status = url.searchParams.get('status');

        const where = status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {};

        const coaches = await prisma.coachProfile.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                        createdAt: true,
                    }
                },
                _count: {
                    select: {
                        chatsAsCoach: true,
                        media: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        const coachesWithUrls = coaches.map((coach) => ({
            ...coach,
            user: {
                ...coach.user,
                avatar: coach.user.avatar ? getPublicUrl(coach.user.avatar) : null,
            },
        }));

        return NextResponse.json({ success: true, coaches: coachesWithUrls });
    } catch (err: unknown) {
        console.error('[GET /api/admin/coaches]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR' }
        }, { status: 500 });
    }
}

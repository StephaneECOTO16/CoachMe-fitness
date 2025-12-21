import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getPublicUrl } from '@/lib/aws-s3';

/**
 * GET /api/admin/users
 * Get all users with roles COACH and PROSPECT (admin only).
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
        const users = await prisma.user.findMany({
            where: {
                role: {
                    in: ['COACH', 'PROSPECT']
                }
            },
            include: {
                coachProfile: {
                    include: {
                        discipline: true
                    }
                },
                clientProfile: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const formattedUsers = users.map(user => {
            const avatar = user.avatar ? getPublicUrl(user.avatar) : null;

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar,
                createdAt: user.createdAt,
                // Coach specific
                specialty: user.coachProfile?.discipline?.name || null,
                status: user.coachProfile?.status || null,
                coachId: user.coachProfile?.id || null,
                // Prospect specific
                goals: user.clientProfile?.goals || null,
                // Raw profiles for modal
                coachProfile: user.coachProfile,
                clientProfile: user.clientProfile
            };
        });

        return NextResponse.json({ success: true, users: formattedUsers });
    } catch (err: unknown) {
        console.error('[GET /api/admin/users]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR' }
        }, { status: 500 });
    }
}

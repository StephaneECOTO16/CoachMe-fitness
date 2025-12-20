import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getPublicUrl } from '@/lib/aws-s3';

/**
 * GET /api/admin/disciplines
 * Get all disciplines with coach counts (admin only).
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
        const disciplines = await prisma.discipline.findMany({
            include: {
                _count: {
                    select: { coaches: { where: { status: 'APPROVED' } } }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        const formattedDisciplines = disciplines.map(d => ({
            id: d.id,
            name: d.name,
            imageUrl: d.imageUrl ? getPublicUrl(d.imageUrl) : null,
            coachCount: d._count.coaches,
            createdAt: d.createdAt,
        }));

        return NextResponse.json({ success: true, disciplines: formattedDisciplines });
    } catch (err: unknown) {
        console.error('[GET /api/admin/disciplines]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR' }
        }, { status: 500 });
    }
}

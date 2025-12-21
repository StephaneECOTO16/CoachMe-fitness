import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPublicUrl } from '@/lib/aws-s3';

/**
 * GET /api/disciplines
 * Public endpoint to list all disciplines.
 * Returns discipline names for dropdowns and filtering.
 */
export async function GET(req: Request) {
    try {
        const disciplines = await prisma.discipline.findMany({
            include: {
                _count: {
                    select: { coaches: { where: { status: 'APPROVED' } } }
                }
            },
            orderBy: { name: 'asc' },
        });

        const formattedDisciplines = disciplines.map(d => ({
            id: d.id,
            name: d.name,
            imageUrl: d.imageUrl ? getPublicUrl(d.imageUrl) : null,
            coachCount: d._count.coaches,
        }));

        return NextResponse.json({ success: true, disciplines: formattedDisciplines });
    } catch (err: unknown) {
        console.error('[GET /api/disciplines]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/disciplines
 * Public endpoint to list all disciplines.
 * Returns discipline names for dropdowns and filtering.
 */
export async function GET(req: Request) {
    try {
        const disciplines = await prisma.discipline.findMany({
            select: {
                id: true,
                name: true,
                imageUrl: true,
            },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json({ success: true, disciplines });
    } catch (err: unknown) {
        console.error('[GET /api/disciplines]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

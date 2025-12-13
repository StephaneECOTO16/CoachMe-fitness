import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPublicUrl } from '@/lib/aws-s3';

/**
 * GET /api/coaches/[coachId]
 * Public endpoint to fetch a specific coach profile.
 * Only shows approved coaches.
 */
export async function GET(req: Request, { params }: { params: Promise<{ coachId: string }> }) {
    const { coachId: coachIdParam } = await params;
    const coachId = parseInt(coachIdParam);
    if (isNaN(coachId)) return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT' } }, { status: 400 });

    try {
        const coach = await prisma.coachProfile.findUnique({
            where: { id: coachId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                media: true,
            },
        });

        if (!coach) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

        // Only show approved coaches publicly
        if (coach.status !== 'APPROVED') {
            return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
        }

        // Convert S3 keys to full URLs
        const coachWithUrls = {
            ...coach,
            media: coach.media.map(m => ({
                ...m,
                url: getPublicUrl(m.url)
            }))
        };

        return NextResponse.json({ success: true, coach: coachWithUrls });
    } catch (err: unknown) {
        console.error('[GET /api/coaches/:coachId]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

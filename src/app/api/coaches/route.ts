import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPublicUrl } from '@/lib/aws-s3';


/**
 * GET /api/coaches
 * Public endpoint to list all approved coaches with filtering.
 * Filtered by discipline, rating, hourly rate, sorted by creation date.
 * No authentication required.
 */
export async function GET(req: Request) {
    const url = new URL(req.url);
    const discipline = url.searchParams.get('discipline') || undefined;
    const minRating = url.searchParams.get('minRating') ? parseFloat(url.searchParams.get('minRating')!) : undefined;
    const rateTypeParam = url.searchParams.get('rateType') || undefined;
    const maxRate = url.searchParams.get('maxRate') ? parseFloat(url.searchParams.get('maxRate')!) : undefined;
    const maxHourlyRate = url.searchParams.get('maxHourlyRate') ? parseFloat(url.searchParams.get('maxHourlyRate')!) : undefined;
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    try {
        const whereClause: any = {
            status: 'APPROVED',
        };

        const normalizedRateType =
            rateTypeParam && ['HOUR', 'WEEK', 'MONTH'].includes(rateTypeParam.toUpperCase())
                ? rateTypeParam.toUpperCase()
                : undefined;

        if (discipline) {
            whereClause.discipline = {
                name: { contains: discipline, mode: 'insensitive' }
            };
        }

        if (minRating !== undefined) {
            whereClause.minRating = { gte: minRating };
        }

        if (normalizedRateType !== undefined) {
            whereClause.rateType = normalizedRateType;
        }

        const effectiveMaxRate = maxRate ?? maxHourlyRate;
        if (effectiveMaxRate !== undefined) {
            whereClause.rateAmount = { lte: effectiveMaxRate };
            if (normalizedRateType === undefined && maxHourlyRate !== undefined) {
                whereClause.rateType = 'HOUR';
            }
        }

        const coaches = await prisma.coachProfile.findMany({
            where: whereClause,
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                discipline: { select: { id: true, name: true, imageUrl: true } },
                media: { take: 5 }, // Limit media to 5 items per coach
            },
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
        });

        const coachesWithUrls = coaches.map((coach) => ({
            ...coach,
            user: {
                ...coach.user,
                avatar: coach.user.avatar ? getPublicUrl(coach.user.avatar) : null,
            },
            media: coach.media.map((m) => ({
                ...m,
                url: getPublicUrl(m.url),
            })),
        }));

        const total = await prisma.coachProfile.count({
            where: whereClause,
        });

        return NextResponse.json({ success: true, coaches: coachesWithUrls, total, limit, offset });
    } catch (err: unknown) {
        console.error('[GET /api/coaches]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

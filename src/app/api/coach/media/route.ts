import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/coach/media
 * Register a media file in the database after successful R2 upload.
 * Coach calls this endpoint after uploading to presigned URL.
 */
export async function POST(req: Request) {
    const payload = requireAuth(req, ['COACH']);
    if (!payload) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    try {
        const body = await req.json();
        const { s3Key, mimeType, sizeBytes, description, type } = body;

        // Validate input
        if (!s3Key || !mimeType || !type) {
            return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: 's3Key, mimeType, and type required' } }, { status: 400 });
        }

        // Validate media type
        const validTypes = ['CERTIFICATE', 'IMAGE', 'VIDEO', 'OTHER'];
        if (!validTypes.includes(type)) {
            return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Invalid media type' } }, { status: 400 });
        }

        // Ensure coach profile exists
        const coachProfile = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
        if (!coachProfile) {
            return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Coach profile not found' } }, { status: 404 });
        }

        // Create media record
        const media = await prisma.media.create({
            data: {
                coachId: coachProfile.id,
                ownerId: payload.userId,
                url: s3Key, // Store R2 key; can be resolved to full URL when needed
                type,
                mimeType,
                sizeBytes: sizeBytes || 0,
                description: description || undefined,
            },
        });

        return NextResponse.json({ success: true, media });
    } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[POST /api/coach/media]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: errMsg } }, { status: 500 });
    }
}/**
 * GET /api/coach/media
 * List media files for the authenticated coach.
 */
export async function GET(req: Request) {
    const payload = requireAuth(req, ['COACH']);
    if (!payload) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    try {
        const coachProfile = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
        if (!coachProfile) {
            return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
        }

        const media = await prisma.media.findMany({
            where: { coachId: coachProfile.id },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ success: true, media });
    } catch (err: unknown) {
        console.error('[GET /api/coach/media]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

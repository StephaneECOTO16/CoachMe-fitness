import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { generatePresignedUrl, getPublicUrl } from '@/lib/aws-s3';

/**
 * POST /api/coach/media/presigned-url
 * Generate a presigned Cloudflare R2 URL for media uploads.
 * Coach can upload certificates, images, and videos.
 * Only authenticated COACH users can request presigned URLs.
 */
export async function POST(req: Request) {
    const payload = requireAuth(req, ['COACH']);
    if (!payload) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    try {
        const body = await req.json();
        const { fileName, mimeType, fileSize } = body;

        // Validate input
        if (!fileName || !mimeType || !fileSize) {
            return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: 'fileName, mimeType, and fileSize required' } }, { status: 400 });
        }

        // Ensure coach profile exists
        const coachProfile = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
        if (!coachProfile) {
            return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Coach profile not found. Complete onboarding first.' } }, { status: 404 });
        }

        // Generate presigned URL
        const presigned = await generatePresignedUrl(fileName, mimeType, coachProfile.id, fileSize);

        return NextResponse.json({ success: true, presignedUrl: presigned });
    } catch (err: any) {
        console.error('[POST /api/coach/media/presigned-url]', err);
        return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: err.message } }, { status: 400 });
    }
}

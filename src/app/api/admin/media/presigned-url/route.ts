import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateDisciplinePresignedUrl } from '@/lib/aws-s3';

/**
 * POST /api/admin/media/presigned-url
 * Generate a presigned Cloudflare R2 URL for administrative media uploads.
 * Only authenticated ADMIN users can request these presigned URLs.
 */
export async function POST(req: Request) {
    const payload = await requireAuth(req, ['ADMIN']);
    if (!payload) {
        return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { fileName, mimeType, fileSize } = body;

        // Validate input
        if (!fileName || !mimeType || !fileSize) {
            return NextResponse.json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'fileName, mimeType, and fileSize required' }
            }, { status: 400 });
        }

        // Generate presigned URL for administrative media
        const presigned = await generateDisciplinePresignedUrl(fileName, mimeType, fileSize);

        return NextResponse.json({ success: true, presignedUrl: presigned });
    } catch (err: any) {
        console.error('[POST /api/admin/media/presigned-url]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: err.message }
        }, { status: 500 });
    }
}

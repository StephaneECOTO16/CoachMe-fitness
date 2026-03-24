import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateDisciplineImagePresignedUrl } from '@/lib/storage';

/**
 * POST /api/admin/media/presigned-url
 * Generate a presigned Cloudflare R2 URL for administrative media uploads.
 * Only authenticated ADMIN users can request these presigned URLs.
 */
export async function POST(req: Request) {
    const payload = await requireAuth(req, { allowedRoles: ['ADMIN'] });
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
        const presigned = await generateDisciplineImagePresignedUrl(fileName, mimeType, fileSize);

        return NextResponse.json({ success: true, presignedUrl: presigned });
    } catch (err: unknown) {
        const error = err as Error;
        console.error('[POST /api/admin/media/presigned-url]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        }, { status: 500 });
    }
}

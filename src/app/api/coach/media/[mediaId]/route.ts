import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { deleteMediaFromS3 } from '@/lib/aws-s3';

/**
 * DELETE /api/coach/media/[mediaId]
 * Delete a media file (for coaches only).
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ mediaId: string }> }
) {
    const payload = await requireAuth(req, ['COACH']);
    if (!payload) {
        return NextResponse.json(
            { success: false, error: { code: 'UNAUTHORIZED' } },
            { status: 401 }
        );
    }

    try {
        const { mediaId: mediaIdParam } = await params;
        const mediaId = parseInt(mediaIdParam);

        if (isNaN(mediaId)) {
            return NextResponse.json(
                { success: false, error: { code: 'INVALID_INPUT', message: 'Invalid media ID' } },
                { status: 400 }
            );
        }

        // Ensure coach profile exists
        const coachProfile = await prisma.coachProfile.findUnique({
            where: { userId: payload.userId },
        });

        if (!coachProfile) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Coach profile not found' } },
                { status: 404 }
            );
        }

        // Find the media and verify ownership
        const media = await prisma.media.findUnique({
            where: { id: mediaId },
        });

        if (!media) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Media not found' } },
                { status: 404 }
            );
        }

        if (media.coachId !== coachProfile.id && media.ownerId !== payload.userId) {
            return NextResponse.json(
                { success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this media' } },
                { status: 403 }
            );
        }

        // Delete the media record from database
        await prisma.media.delete({
            where: { id: mediaId },
        });

        // 2. Physical Deletion from S3/R2
        if (media.url) {
            await deleteMediaFromS3(media.url);
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error('[DELETE /api/coach/media/[mediaId]]', err);
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR' } },
            { status: 500 }
        );
    }
}

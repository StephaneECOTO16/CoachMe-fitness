import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * DELETE /api/coach/media/[mediaId]
 * Delete a media file (for coaches only).
 */
export async function DELETE(
    req: Request,
    { params }: { params: { mediaId: string } }
) {
    const payload = requireAuth(req, ['COACH']);
    if (!payload) {
        return NextResponse.json(
            { success: false, error: { code: 'UNAUTHORIZED' } },
            { status: 401 }
        );
    }

    try {
        const mediaId = parseInt(params.mediaId);

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

        // Note: In production, you should also delete the file from S3
        // This would require AWS SDK integration
        // Example:
        // const s3Client = new S3Client({ region: process.env.AWS_REGION });
        // await s3Client.send(new DeleteObjectCommand({
        //     Bucket: process.env.AWS_S3_BUCKET,
        //     Key: media.url
        // }));

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error('[DELETE /api/coach/media/[mediaId]]', err);
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR' } },
            { status: 500 }
        );
    }
}

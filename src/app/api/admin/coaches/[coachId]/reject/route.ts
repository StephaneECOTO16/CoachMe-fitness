import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';
import { parseRequestBody } from '@/lib/schemas';

// Define inline schema for rejection request
const RejectCoachBodySchema = z.object({
    reason: z.string().min(5, 'Rejection reason must be at least 5 characters'),
});

/**
 * POST /api/admin/coaches/:coachId/reject
 * Admin endpoint to reject a coach profile.
 * Requires a rejection reason in the body.
 * Creates an AdminReview record for audit trail.
 */
export async function POST(req: Request, { params }: { params: Promise<{ coachId: string }> }) {
    // Validate authentication
    const payload = requireAuth(req, ['ADMIN']);
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Admin access required' }
        }, { status: 401 });
    }

    // Validate coach ID parameter
    const { coachId: coachIdParam } = await params;
    const coachId = parseInt(coachIdParam);
    if (isNaN(coachId)) {
        return NextResponse.json({
            success: false,
            error: { code: 'INVALID_INPUT', message: 'Invalid coach ID' }
        }, { status: 400 });
    }

    // Validate request body using Zod schema
    const { data, error } = await parseRequestBody(req, RejectCoachBodySchema);
    if (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }

    if (!data) {
        return NextResponse.json({ success: false, error: { code: "INVALID_REQUEST" } }, { status: 400 });
    }

    const { reason } = data;

    try {
        const coach = await prisma.coachProfile.findUnique({ where: { id: coachId } });
        if (!coach) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

        // Update coach status to REJECTED and store the reason
        const updated = await prisma.coachProfile.update({
            where: { id: coachId },
            data: { status: 'REJECTED', statusReason: reason },
        });

        // Create audit record
        await prisma.adminReview.create({
            data: {
                coachId,
                adminId: payload.userId,
                action: 'REJECTED',
                comment: reason,
            },
        });

        return NextResponse.json({ success: true, coach: updated });
    } catch (err) {
        console.error('[POST /api/admin/coaches/:coachId/reject]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

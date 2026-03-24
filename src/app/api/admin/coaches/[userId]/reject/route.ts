import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';
import { parseRequestBody } from '@/lib/schemas';
import { sendMail, getCoachRejectedTemplate } from "@/lib/mail";

// Define inline schema for rejection request
const RejectCoachBodySchema = z.object({
    reason: z.string().min(5, 'Rejection reason must be at least 5 characters'),
});

/**
 * POST /api/admin/coaches/:userId/reject
 * Admin endpoint to reject a coach profile.
 * Requires a rejection reason in the body.
 * Creates an AdminReview record for audit trail.
 */
export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    // Validate authentication
    const payload = await requireAuth(req, { allowedRoles: ['ADMIN'] });
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Admin access required' }
        }, { status: 401 });
    }

    // Validate User UUID parameter
    const { userId } = await params;

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
        const coach = await prisma.coachProfile.findUnique({
            where: { userId: userId }, // Query by unique User UUID
            include: { user: true }
        });
        if (!coach) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

        // Update coach status to REJECTED and store the reason
        const updated = await prisma.coachProfile.update({
            where: { id: coach.id }, // Use internal ID for update
            data: { status: 'REJECTED', statusReason: reason },
        });

        // Create audit record
        await prisma.adminReview.create({
            data: {
                coachId: coach.id,
                adminId: payload.userId,
                action: 'REJECTED',
                comment: reason,
            },
        });

        // Send Rejection Email
        if (coach.user.email) {
            await sendMail({
                to: coach.user.email,
                subject: "Update on your Coach Application",
                html: getCoachRejectedTemplate(coach.user.name || "Coach"),
            });
        }

        return NextResponse.json({ success: true, coach: updated });
    } catch (err) {
        console.error('[POST /api/admin/coaches/:userId/reject]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

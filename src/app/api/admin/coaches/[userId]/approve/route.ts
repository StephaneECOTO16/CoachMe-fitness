import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendMail, getCoachApprovedTemplate } from "@/lib/mail";

/**
 * POST /api/admin/coaches/:userId/approve
 * Admin endpoint to approve a coach profile and make them visible.
 * Creates an AdminReview record for audit trail.
 */
export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    const payload = await requireAuth(req, { allowedRoles: ['ADMIN'] });
    if (!payload) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const { userId } = await params;

    try {
        const coach = await prisma.coachProfile.findUnique({
            where: { userId: userId }, // Query by unique User UUID
            include: { user: true }
        });
        if (!coach) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

        // Update coach status to APPROVED
        const updated = await prisma.coachProfile.update({
            where: { id: coach.id }, // Use internal ID for update
            data: { status: 'APPROVED' },
        });

        // Create audit record
        await prisma.adminReview.create({
            data: {
                coachId: coach.id,
                adminId: payload.userId, // This is the admin's UUID
                action: 'APPROVED',
                comment: req.headers.get('x-comment') || undefined,
            },
        });

        // Send Approval Email
        if (coach.user.email) {
            await sendMail({
                to: coach.user.email,
                subject: "Your Coach Profile is Approved!",
                html: getCoachApprovedTemplate(coach.user.name || "Coach"),
            });
        }

        return NextResponse.json({ success: true, coach: updated });
    } catch (err) {
        console.error('[POST /api/admin/coaches/:userId/approve]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

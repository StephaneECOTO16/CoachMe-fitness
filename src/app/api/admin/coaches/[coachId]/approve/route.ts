import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sendMail, getCoachApprovedTemplate } from "@/lib/mail";

/**
 * POST /api/admin/coaches/:coachId/approve
 * Admin endpoint to approve a coach profile and make them visible.
 * Creates an AdminReview record for audit trail.
 */
export async function POST(req: Request, { params }: { params: Promise<{ coachId: string }> }) {
    const payload = await requireAuth(req, ['ADMIN']);
    if (!payload) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const { coachId: coachIdParam } = await params;
    const coachId = parseInt(coachIdParam);
    if (isNaN(coachId)) return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT' } }, { status: 400 });

    try {
        const coach = await prisma.coachProfile.findUnique({
            where: { id: coachId },
            include: { user: true } // Include user to get email
        });
        if (!coach) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

        // Update coach status to APPROVED
        const updated = await prisma.coachProfile.update({
            where: { id: coachId },
            data: { status: 'APPROVED' },
        });

        // Create audit record
        await prisma.adminReview.create({
            data: {
                coachId,
                adminId: payload.userId,
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
        console.error('[POST /api/admin/coaches/:coachId/approve]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

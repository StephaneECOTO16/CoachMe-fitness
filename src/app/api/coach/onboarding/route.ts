import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { parseRequestBody, CoachOnboardingSchema } from '@/lib/schemas';
import { sendNotification } from '@/lib/notifications';

export async function POST(req: Request) {
    // Validate authentication
    const payload = await requireAuth(req, { allowedRoles: ['PROSPECT'] });
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        }, { status: 401 });
    }

    // Validate request body using Zod schema
    const { data, error } = await parseRequestBody(req, CoachOnboardingSchema);
    if (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }

    if (!data) {
        return NextResponse.json({ success: false, error: { code: "INVALID_REQUEST" } }, { status: 400 });
    }

    const { discipline, portfolio, bio } = data;

    // Check if coach profile already exists
    const existing = await prisma.coachProfile.findUnique({
        where: { userId: payload.userId }
    });
    if (existing) {
        return NextResponse.json({
            success: false,
            error: { code: 'ALREADY_EXISTS', message: 'Coach profile already exists' }
        }, { status: 409 });
    }

    const disciplineRecord = await prisma.discipline.findUnique({
        where: { name: discipline },
    });
    if (!disciplineRecord) {
        return NextResponse.json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid discipline' }
        }, { status: 400 });
    }

    // Create coach profile with PENDING status
    const coach = await prisma.coachProfile.create({
        data: {
            userId: payload.userId,
            disciplineId: disciplineRecord.id,
            portfolio,
            bio,
            status: 'PENDING'
        }
    });

    // Notify all admins that a new coach application is awaiting review
    // (non-blocking — an admin notification failure must not fail the
    // coach's own onboarding submission).
    prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
        .then((admins) => Promise.allSettled(admins.map((admin) => sendNotification({
            userId: admin.id,
            title: 'Nouvelle candidature coach',
            body: `${payload.name || payload.email} a soumis une candidature coach en attente de validation.`,
            type: 'ACCOUNT_REVIEW',
            url: '/admin/dashboard'
        }))))
        .catch((err) => console.error('[POST /api/coach/onboarding] admin notification failed:', err));

    return NextResponse.json({
        success: true,
        coachProfile: {
            id: coach.id,
            status: coach.status,
            createdAt: coach.createdAt
        }
    }, { status: 201 });
}

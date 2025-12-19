import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { parseRequestBody, CoachOnboardingSchema } from '@/lib/schemas';

export async function POST(req: Request) {
    // Validate authentication
    const payload = await requireAuth(req, ['PROSPECT']);
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

    return NextResponse.json({
        success: true,
        coachProfile: {
            id: coach.id,
            status: coach.status,
            createdAt: coach.createdAt
        }
    }, { status: 201 });
}

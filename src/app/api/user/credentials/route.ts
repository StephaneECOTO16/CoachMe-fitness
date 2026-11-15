import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { UpdateCredentialsRequestSchema, parseRequestBody } from '@/lib/schemas';

export async function PATCH(req: NextRequest) {
    const authPayload = await requireAuth(req, { checkCoachStatus: false });
    if (!authPayload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'You must be logged in' }
        }, { status: 401 });
    }

    const { data, error } = await parseRequestBody(req, UpdateCredentialsRequestSchema);
    if (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const { email } = data!;

    try {
        // Email is unique per role: only another account of the SAME role
        // (e.g. another coach) can block it — the user's own client/coach
        // twin account may legitimately share the email.
        const existingUser = await prisma.user.findFirst({
            where: { email, role: authPayload.role, id: { not: authPayload.userId } },
            select: { id: true },
        });

        if (existingUser) {
            return NextResponse.json({
                success: false,
                error: { code: 'EMAIL_IN_USE', message: 'Email is already in use' }
            }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: authPayload.userId },
            data: { email },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            }
        });

        return NextResponse.json({ success: true, data: updatedUser });
    } catch (err) {
        console.error('[API_USER_CREDENTIALS_PATCH]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to update credentials' }
        }, { status: 500 });
    }
}

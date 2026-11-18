import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, reissueSession } from '@/lib/auth';
import { getPublicUrl } from '@/lib/storage';
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

    // Same normalisation as register/login/forgot-password: an email saved
    // with capitals or spaces could otherwise never be found again at login.
    const email = data!.email.toLowerCase().trim();

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
                avatar: true,
            }
        });

        // The email is part of the session claims: refresh them.
        await reissueSession({
            userId: updatedUser.id,
            role: updatedUser.role,
            email: updatedUser.email,
            name: updatedUser.name,
            avatar: updatedUser.avatar ? getPublicUrl(updatedUser.avatar) : null,
        });

        return NextResponse.json({
            success: true,
            data: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, role: updatedUser.role },
        });
    } catch (err) {
        // Two requests racing for the same email: the DB unique index wins.
        if ((err as { code?: string })?.code === 'P2002') {
            return NextResponse.json({
                success: false,
                error: { code: 'EMAIL_IN_USE', message: 'Email is already in use' }
            }, { status: 400 });
        }
        console.error('[API_USER_CREDENTIALS_PATCH]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to update credentials' }
        }, { status: 500 });
    }
}

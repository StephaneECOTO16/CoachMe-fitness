import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, comparePassword, hashPassword } from '@/lib/auth';
import { ChangePasswordRequestSchema, parseRequestBody } from '@/lib/schemas';

export async function POST(req: NextRequest) {
    const authPayload = await requireAuth(req);
    if (!authPayload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'You must be logged in' }
        }, { status: 401 });
    }

    const { data, error } = await parseRequestBody(req, ChangePasswordRequestSchema);
    if (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const { currentPassword, newPassword } = data!;

    try {
        const user = await prisma.user.findUnique({
            where: { id: authPayload.userId },
        });

        if (!user) {
            return NextResponse.json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'User not found' }
            }, { status: 404 });
        }

        // Verify current password
        const isMatch = await comparePassword(currentPassword, user.password);
        if (!isMatch) {
            return NextResponse.json({
                success: false,
                error: { code: 'INCORRECT_PASSWORD', message: 'Current password is incorrect' }
            }, { status: 400 });
        }

        // Hash and update to new password
        const hashedPassword = await hashPassword(newPassword);
        await prisma.user.update({
            where: { id: authPayload.userId },
            data: { password: hashedPassword },
        });

        return NextResponse.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        console.error('[API_USER_CHANGE_PASSWORD_POST]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to change password' }
        }, { status: 500 });
    }
}

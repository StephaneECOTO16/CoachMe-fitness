import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, comparePassword, SESSION_COOKIE } from '@/lib/auth';
import { DeleteAccountRequestSchema } from '@/lib/validation/schemas';
import { parseRequestBody } from '@/lib/validation/schemas';
import { cookies } from 'next/headers';
import { deleteUserAccount } from '@/services/user.service';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
    const authPayload = await requireAuth(req, { checkCoachStatus: false });
    if (!authPayload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'You must be logged in' }
        }, { status: 401 });
    }

    const { data, error } = await parseRequestBody(req, DeleteAccountRequestSchema);
    if (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const { password } = data!;

    try {
        // 1. Verify user exists and get password
        const user = await prisma.user.findUnique({
            where: { id: authPayload.userId },
            select: { password: true }
        });

        if (!user) {
            return NextResponse.json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'User not found' }
            }, { status: 404 });
        }

        // 2. Verify password before deletion
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return NextResponse.json({
                success: false,
                error: { code: 'INCORRECT_PASSWORD', message: 'Incorrect password' }
            }, { status: 400 });
        }

        // 3. Delegate complex deletion logic to the unified service
        await deleteUserAccount(authPayload.userId);

        // 4. Clear the auth cookie
        const cookieStore = await cookies();
        cookieStore.delete(SESSION_COOKIE);

        return NextResponse.json({ success: true, message: 'Account deleted successfully' });
    } catch (err: unknown) {
        console.error('[API_USER_DELETE_ACCOUNT_POST]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to delete account' }
        }, { status: 500 });
    }
}

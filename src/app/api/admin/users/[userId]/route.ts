import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { softDeleteUser, restoreUser, setUserActive } from '@/services/admin.service';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    const payload = await requireAuth(req, { allowedRoles: ['ADMIN'] });
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Admin access required' }
        }, { status: 401 });
    }

    const { userId } = await params;
    if (!userId) {
        return NextResponse.json({
            success: false,
            error: { code: 'INVALID_ID', message: 'User ID is required' }
        }, { status: 400 });
    }

    try {
        await softDeleteUser(userId);
        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (error: unknown) {
        const err = error as { code?: string; status?: number; message?: string };
        if (err.status) {
            return NextResponse.json({
                success: false,
                error: { code: err.code, message: err.message }
            }, { status: err.status });
        }
        console.error('[DELETE /api/admin/users/[userId]]', error);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to delete user' }
        }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/users/[userId]
 * Body: { action: 'activate' | 'deactivate' | 'restore' }
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    const payload = await requireAuth(req, { allowedRoles: ['ADMIN'] });
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Admin access required' }
        }, { status: 401 });
    }

    const { userId } = await params;
    if (!userId) {
        return NextResponse.json({
            success: false,
            error: { code: 'INVALID_ID', message: 'User ID is required' }
        }, { status: 400 });
    }

    try {
        const { action } = await req.json();

        let user;
        switch (action) {
            case 'activate':
                user = await setUserActive(userId, true);
                break;
            case 'deactivate':
                user = await setUserActive(userId, false);
                break;
            case 'restore':
                user = await restoreUser(userId);
                break;
            default:
                return NextResponse.json({
                    success: false,
                    error: { code: 'INVALID_INPUT', message: 'Invalid action' }
                }, { status: 400 });
        }

        return NextResponse.json({ success: true, user });
    } catch (error: unknown) {
        const err = error as { code?: string; status?: number; message?: string };
        if (err.status) {
            return NextResponse.json({
                success: false,
                error: { code: err.code, message: err.message }
            }, { status: err.status });
        }
        console.error('[PATCH /api/admin/users/[userId]]', error);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to update user' }
        }, { status: 500 });
    }
}
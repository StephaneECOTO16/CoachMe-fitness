import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

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
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { coachProfile: true, clientProfile: true }
        });

        if (!user) {
            return NextResponse.json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'User not found' }
            }, { status: 404 });
        }

        if (user.role === 'ADMIN') {
            return NextResponse.json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Cannot delete admin users' }
            }, { status: 403 });
        }

        await prisma.user.delete({ where: { id: userId } });

        return NextResponse.json({ success: true, message: 'User deleted successfully' });

    } catch (error: unknown) {
        console.error('[DELETE /api/admin/users/[userId]]', error);
        const err = error as { code?: string };
        if (err.code === 'P2003') {
            return NextResponse.json({
                success: false,
                error: { code: 'DEPENDENCY_ERROR', message: 'Cannot delete user with existing dependencies' }
            }, { status: 400 });
        }
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to delete user' }
        }, { status: 500 });
    }
}
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';

/**
 * DELETE /api/admin/users/[userId]
 * Deletes a user (PROSPECT or COACH) and all associated data
 * Requires ADMIN role
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        // Verify admin authentication
        const token = req.headers.get('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return NextResponse.json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            }, { status: 401 });
        }

        const decoded = verifyJwt(token);
        if (!decoded || decoded.role !== 'ADMIN') {
            return NextResponse.json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Admin access required' }
            }, { status: 403 });
        }

        const { userId: userIdParam } = await params;
        const userId = parseInt(userIdParam);
        if (isNaN(userId)) {
            return NextResponse.json({
                success: false,
                error: { code: 'INVALID_ID', message: 'Invalid user ID' }
            }, { status: 400 });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                coachProfile: true,
                clientProfile: true
            }
        });

        if (!user) {
            return NextResponse.json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'User not found' }
            }, { status: 404 });
        }

        // Prevent deletion of ADMIN users
        if (user.role === 'ADMIN') {
            return NextResponse.json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Cannot delete admin users' }
            }, { status: 403 });
        }

        // Delete user and all associated data in a transaction
        // Prisma cascade delete will handle related records
        await prisma.user.delete({
            where: { id: userId }
        });

        return NextResponse.json({
            success: true,
            message: 'User deleted successfully'
        }, { status: 200 });

    } catch (error: any) {
        console.error('[DELETE /api/admin/users/[userId]]', error);

        // Handle Prisma foreign key constraint errors
        if (error.code === 'P2003') {
            return NextResponse.json({
                success: false,
                error: {
                    code: 'DEPENDENCY_ERROR',
                    message: 'Cannot delete user with existing dependencies'
                }
            }, { status: 400 });
        }

        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to delete user' }
        }, { status: 500 });
    }
}

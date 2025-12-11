import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/admin/stats
 * Get platform statistics (admin only).
 */
export async function GET(req: Request) {
    const payload = requireAuth(req, ['ADMIN']);
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Admin access required' }
        }, { status: 401 });
    }

    try {
        // Get user counts by role
        const totalUsers = await prisma.user.count();
        const totalProspects = await prisma.user.count({ where: { role: 'PROSPECT' } });
        const totalCoaches = await prisma.user.count({ where: { role: 'COACH' } });
        const totalAdmins = await prisma.user.count({ where: { role: 'ADMIN' } });

        // Get coach profile counts by status
        const pendingCoaches = await prisma.coachProfile.count({ where: { status: 'PENDING' } });
        const approvedCoaches = await prisma.coachProfile.count({ where: { status: 'APPROVED' } });
        const rejectedCoaches = await prisma.coachProfile.count({ where: { status: 'REJECTED' } });

        // Get chat and message counts
        const totalChats = await prisma.chat.count();
        const totalMessages = await prisma.message.count();

        const stats = {
            totalUsers,
            totalProspects,
            totalCoaches,
            totalAdmins,
            pendingCoaches,
            approvedCoaches,
            rejectedCoaches,
            totalChats,
            totalMessages,
        };

        return NextResponse.json({ success: true, stats });
    } catch (err: unknown) {
        console.error('[GET /api/admin/stats]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR' }
        }, { status: 500 });
    }
}

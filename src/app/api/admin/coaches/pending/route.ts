import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';


export async function GET(req: Request) {
    const payload = await requireAuth(req, { allowedRoles: ['ADMIN'] });
    if (!payload) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const pending = await prisma.coachProfile.findMany({ where: { status: 'PENDING' }, include: { user: true, media: true } });
    return NextResponse.json({ success: true, pending });
}

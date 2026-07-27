import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    // checkCoachStatus: false — a coach pending approval must still be able
    // to see their own notifications (e.g. "application received").
    const session = await requireAuth(req, { checkCoachStatus: false });
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    const whereClause: any = { userId: session.userId };
    if (type) {
      whereClause.type = type;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireAuth(req, { checkCoachStatus: false });
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationIds, isRead } = await req.json();

    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: session.userId
      },
      data: { isRead }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notifications', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireAuth(req, { checkCoachStatus: false });
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');
    if (!idsParam) {
      return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
    }

    const notificationIds = idsParam.split(',').map(id => parseInt(id, 10));

    await prisma.notification.deleteMany({
      where: {
        id: { in: notificationIds },
        userId: session.userId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notifications', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

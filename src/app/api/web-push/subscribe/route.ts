import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:example@yourdomain.org',
    publicVapidKey,
    privateVapidKey
  );
}

export async function POST(req: Request) {
  try {
    // checkCoachStatus: false — a coach pending approval must still be able
    // to subscribe to push, otherwise they never receive the "approved" push.
    const session = await requireAuth(req, { checkCoachStatus: false });
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription } = await req.json();

    // 2. Save Subscription to DB
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: session.userId,
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: session.userId,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving subscription', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/web-push/subscribe
 * Removes a push subscription — called when the user disables push
 * notifications from Settings, or when unregistering the service worker.
 */
export async function DELETE(req: Request) {
  try {
    const session = await requireAuth(req, { checkCoachStatus: false });
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing subscription', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

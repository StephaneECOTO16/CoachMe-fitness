import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/web-push/test
 * Sends a real push notification to every device the current user has
 * subscribed on, and reports exactly what happened for each one — unlike
 * sendNotification() in lib/notifications.ts, which swallows push errors
 * so a chat message or approval never fails just because push is down.
 * This route exists purely so a user (or support) can self-diagnose why
 * push isn't arriving, without needing access to Vercel function logs.
 */
export async function POST(req: Request) {
  try {
    const session = await requireAuth(req, { checkCoachStatus: false });
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
    }

    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicVapidKey || !privateVapidKey) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VAPID_NOT_CONFIGURED',
          message: 'Les clés VAPID ne sont pas configurées sur le serveur — le push est désactivé pour tout le monde tant que ça n\'est pas corrigé côté Vercel.',
        },
      }, { status: 500 });
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@coachme.com',
      publicVapidKey,
      privateVapidKey
    );

    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: session.userId } });

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_SUBSCRIPTION',
          message: 'Aucun appareil abonné pour ce compte — active le push dans Réglages sur cet appareil, puis relance le test.',
        },
      }, { status: 404 });
    }

    const payload = JSON.stringify({
      title: 'Test CoachMe',
      body: 'Si tu vois cette notification, le push fonctionne 🎉',
      icon: '/coachMe.png',
      url: '/notifications',
      unreadCount: 0,
    });

    const results = await Promise.all(subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
          payload
        );
        return { device: sub.endpoint.slice(-16), status: 'sent' as const };
      } catch (err: unknown) {
        const e = err as { statusCode?: number; body?: string; message?: string };
        // A dead/expired subscription — clean it up like the real send path does.
        if (e.statusCode === 410 || e.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
        return {
          device: sub.endpoint.slice(-16),
          status: 'error' as const,
          statusCode: e.statusCode,
          message: e.body || e.message || 'Unknown error',
        };
      }
    }));

    return NextResponse.json({ success: results.some((r) => r.status === 'sent'), results });
  } catch (err: unknown) {
    // A route with no top-level try/catch returns a bare, bodyless 500 on
    // any unhandled throw — exactly what made the first version of this
    // diagnostic route undiagnosable. Always surface the real cause instead.
    const e = err as { message?: string; name?: string };
    console.error('[POST /api/web-push/test]', err);
    return NextResponse.json({
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: `${e.name || 'Error'}: ${e.message || String(err)}` },
    }, { status: 500 });
  }
}

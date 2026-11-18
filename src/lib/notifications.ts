import webpush from 'web-push';
import { prisma } from '@/lib/db';
import { sendWhatsAppMessage } from '@/lib/evolution';
import { broadcastNotification } from '@/lib/pusher';

// Configure Web Push if keys are present
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@coachme.com',
    publicVapidKey,
    privateVapidKey
  );
}

export type NotificationType = 'CHAT' | 'SYSTEM' | 'ACCOUNT_REVIEW' | 'MATCH';

interface SendNotificationParams {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  icon?: string;
  url?: string;
}

/**
 * Sends a notification and saves it to the database.
 * If the user has active PushSubscriptions, it triggers them.
 */
export async function sendNotification({ userId, title, body, type, icon, url }: SendNotificationParams) {
  try {
    // 1. Save Notification to DB
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
      }
    });

    // 1b. Push it to the user's live feed (in-app, real-time — no reload
    // needed while the app is open). Independent of Web Push below, which
    // covers the app-closed / background case.
    void broadcastNotification(userId, notification);

    // 2. Web Push (app closed / in background) and WhatsApp run in parallel:
    // a slow or unreachable WhatsApp gateway must never delay or drop the
    // push notification on the user's phone.
    await Promise.allSettled([
      sendWebPush({ userId, title, body, type, icon, url }),
      sendWhatsApp(userId, title, body),
    ]);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

async function sendWhatsApp(userId: string, title: string, body: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true }
  });
  if (user?.phone) {
    await sendWhatsAppMessage(user.phone, `*${title}*\n\n${body}`);
  }
}

async function sendWebPush({ userId, title, body, type, icon, url }: SendNotificationParams) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (subscriptions.length === 0) return;

    // Total unread count, so the service worker can set the app icon badge
    // (Badging API) even while the app is fully closed.
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false }
    });

    // 3. Send Web Push to all active devices
    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/coachMe.png',
      url: url || '/notifications',
      // Lets the service worker group notifications per conversation/page.
      tag: type === 'CHAT' && url ? url : undefined,
      unreadCount
    });

    const sendPromises = subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh,
            }
          },
          payload,
          {
            // "high" asks FCM/APNs/Mozilla to wake the phone right away even
            // in battery-saving (Doze) mode; "normal" may be held for minutes.
            urgency: type === 'CHAT' ? 'high' : 'normal',
            // If the phone is offline, keep the push for 24h and deliver it
            // as soon as it reconnects.
            TTL: 24 * 60 * 60,
          }
        );
      } catch (error: any) {
        // If subscription is invalid/expired (410), delete it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error('Push send error:', error);
        }
      }
    });

    await Promise.allSettled(sendPromises);

  } catch (error) {
    console.error('Failed to send web push:', error);
  }
}

'use client';

/**
 * Browser-side helpers for the Web Push subscription lifecycle.
 * Shared between PWASetup (auto-subscribe on load) and the Settings
 * notification toggle (manual opt-in/opt-out).
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

/**
 * Requests notification permission (if needed), subscribes the service
 * worker to Web Push, and registers the subscription with the backend.
 * Returns true on success.
 */
export async function enablePushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return false;

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;
  }
  if (Notification.permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });
  }

  const response = await fetch('/api/web-push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription }),
  });

  return response.ok;
}

/**
 * Silently (re)subscribes to Web Push if — and only if — the browser
 * permission was already granted in a previous session. Never calls
 * Notification.requestPermission() itself: that must only ever happen
 * from an explicit user gesture (see enablePushNotifications), otherwise
 * Chrome throttles/auto-blocks the site's future prompts as spam.
 * Used by PWASetup on every page load to keep an existing subscription
 * alive (e.g. after the browser rotates the push endpoint).
 */
export async function resubscribeIfAlreadyGranted(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  return enablePushNotifications();
}

/**
 * Unsubscribes the current device from Web Push, both locally and on
 * the backend, so no further push notifications are delivered here.
 */
export async function disablePushNotifications(): Promise<boolean> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return true;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => {});

  const response = await fetch('/api/web-push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });

  return response.ok;
}

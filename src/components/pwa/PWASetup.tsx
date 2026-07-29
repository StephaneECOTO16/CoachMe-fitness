'use client';

import { useEffect } from 'react';
import { resubscribeIfAlreadyGranted } from '@/lib/push-client';

export default function PWASetup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // A new service worker taking control means a new deploy shipped
    // (public/sw.js's own bytes changed, which is the only thing that
    // makes the browser install a new worker in the first place). Reload
    // once so the open tab actually runs the new build instead of
    // silently sitting on stale JS until the user manually reopens the
    // app. Guarded so it can only fire once per page load.
    let reloadedForUpdate = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadedForUpdate) return;
      reloadedForUpdate = true;
      window.location.reload();
    });

    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').then(
        function (registration) {
          console.log('Service Worker registration successful with scope: ', registration.scope);

          // Never prompt for permission here — that must come from an
          // explicit user gesture (the Settings toggle). Chrome silently
          // degrades a site's future prompts to a no-op badge once it
          // decides they're being requested without user interaction.
          // We only silently refresh an existing, already-granted
          // subscription (e.g. after the push endpoint rotates).
          void resubscribeIfAlreadyGranted();
        },
        function (err) {
          console.log('Service Worker registration failed: ', err);
        }
      );
    });
  }, []);

  return null;
}

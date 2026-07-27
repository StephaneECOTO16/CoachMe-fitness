'use client';

import { useEffect } from 'react';
import { resubscribeIfAlreadyGranted } from '@/lib/push-client';

export default function PWASetup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

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

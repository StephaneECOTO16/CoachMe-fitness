self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/coachMe.png',
      badge: '/coachMe.png',
      vibrate: [100, 50, 100],
      requireInteraction: true, // Keep on screen until user interacts
      data: {
        url: data.url || '/notifications', // Store URL for click event
        dateOfArrival: Date.now(),
        primaryKey: '2'
      }
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  
  const targetUrl = event.notification.data.url || '/notifications';

  event.waitUntil(clients.matchAll({ type: 'window' }).then(clientsArr => {
    // Check if there is already a window/tab open with this URL
    const hadWindowToFocus = clientsArr.some(windowClient => 
      windowClient.url.includes(targetUrl) ? (windowClient.focus(), true) : false
    );
    
    // Otherwise, open a new tab to the applicable URL and focus it.
    if (!hadWindowToFocus) {
      clients.openWindow(targetUrl).then(windowClient => windowClient ? windowClient.focus() : null);
    }
  }));
});

const CACHE_NAME = 'coachme-offline-v2';
// Matches manifest.json's start_url — the installed PWA opens here, so it
// must be pre-cached for a cold start while offline to work at all.
const OFFLINE_URL = '/login';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        OFFLINE_URL,
        '/manifest.json'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Keep a fresh copy of every page the user actually visits, so an
          // offline reload can restore that specific page instead of only
          // ever falling back to the homepage.
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => {
          return caches.open(CACHE_NAME).then(cache => {
            // 1. This exact page, if we've cached it before.
            // 2. Otherwise the homepage, as a last-resort shell.
            return cache.match(event.request).then(cached => cached || cache.match(OFFLINE_URL));
          });
        })
    );
  }
});

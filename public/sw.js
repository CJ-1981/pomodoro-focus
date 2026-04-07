// Combined Service Worker
// Handles caching, manual push events, and Firebase Cloud Messaging background messages.

importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

const CACHE_NAME = 'pomodoro-v3';
const BASE = self.location.pathname.replace(/\/sw\.js$/, '') || '/';
const ASSETS = [
  './',
  './manifest.json',
  './icons/icon-192.png',
];

// --- Caching Logic ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => 
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ),
      self.clients.claim()
    ])
  );
  
  // Try loading cached Firebase config on activate
  event.waitUntil(loadAndInitFirebase());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!['http:', 'https:'].includes(url.protocol)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          if (event.request.url.startsWith('http')) cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// --- Firebase Messaging Logic ---
let messaging = null;

async function initFirebase(config) {
  try {
    // If already initialized with same name, delete it first to allow update
    try {
      const existingApp = firebase.app('sw-fcm');
      if (existingApp) await existingApp.delete();
    } catch (e) {
      // App doesn't exist yet, ignore
    }

    const app = firebase.initializeApp(config, 'sw-fcm');
    messaging = firebase.messaging(app);

    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Background message received:', payload);
      const data = (payload.data || payload.notification || {});

      self.registration.showNotification(data.title || '🍅 Pomodoro Timer', {
        body: data.body || 'Timer complete!',
        icon: data.icon || './icons/icon-192.png',
        badge: './icons/icon-192.png',
        tag: 'pomodoro',
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        requireInteraction: true,
        data: payload.data,
      });
    });
  } catch (e) {
    console.error('[SW] Firebase SW init failed:', e);
  }
}

async function loadAndInitFirebase() {
  try {
    const cache = await caches.open('pomodoro-config');
    const response = await cache.match('/firebase-config.json');
    if (response) {
      const config = await response.json();
      if (config && config.apiKey && config.projectId) {
        await initFirebase(config);
      }
    }
  } catch (e) {
    // Ignore cache errors
  }
}

// Accept config updates or manual signals from the client
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'FIREBASE_CONFIG') {
    initFirebase(event.data.config);
  } else if (event.data.type === 'TIMER_COMPLETE') {
    // Only show notification if no window is focused
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        const isFocused = clients.some(c => c.focused);
        if (isFocused) {
          console.log('[SW] App is focused, skipping SW notification to avoid double.');
          return;
        }

        const type = event.data.notificationType;
        const messages = {
          work: { title: '🍅 Work Session Complete!', body: 'Great job! Time for a break.' },
          shortBreak: { title: '☕ Break is Over!', body: 'Ready to focus again?' },
          longBreak: { title: '🎉 Long Break Over!', body: "Let's get back to work!" },
        };
        const msg = messages[type] || messages.work;

        return self.registration.showNotification(msg.title, {
          body: msg.body,
          icon: './icons/icon-192.png',
          badge: './icons/icon-192.png',
          tag: 'pomodoro',
          vibrate: [200, 100, 200, 100, 200, 100, 200],
          requireInteraction: true,
        });
      })
    );
  }
});

// Generic Push listener (fallback)
self.addEventListener('push', (event) => {
  let data = { title: '🍅 Pomodoro Timer', body: 'Timer complete!' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      requireInteraction: true,
      tag: 'pomodoro',
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow(BASE);
    })
  );
});

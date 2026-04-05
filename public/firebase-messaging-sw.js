// Firebase Cloud Messaging service worker
// Loads Firebase SDK and initializes with config from cache (set by the client app).

importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

let messaging = null;

async function initFirebase(config) {
  if (messaging) return;
  try {
    const app = firebase.initializeApp(config);
    messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const data = (payload.data || payload.notification || {});

      self.registration.showNotification(data.title || '🍅 Pomodoro Timer', {
        body: data.body || 'Timer complete!',
        icon: data.icon || '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'pomodoro',
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        requireInteraction: true,
        data: payload.data,
      });
    });

    console.log('Firebase Messaging SW initialized');
  } catch (e) {
    console.error('Firebase SW init failed:', e);
  }
}

async function loadConfigFromCache() {
  try {
    const cache = await caches.open('pomodoro-config');
    const response = await cache.match('/firebase-config.json');
    if (response) {
      return await response.json();
    }
  } catch (e) {
    console.log('No cached Firebase config');
  }
  return null;
}

// Try loading cached config on activate
self.addEventListener('activate', async (event) => {
  event.waitUntil(self.clients.claim());
  const config = await loadConfigFromCache();
  if (config && config.apiKey && config.projectId) {
    await initFirebase(config);
  }
});

// Accept config updates from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    initFirebase(event.data.config);
  }
});

// Handle notification clicks — focus or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});

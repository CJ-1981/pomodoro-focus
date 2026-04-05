// Import scripts from Firebase CDN
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

// Firebase config - will be populated from environment
firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY || "",
  authDomain: self.FIREBASE_AUTH_DOMAIN || "",
  projectId: self.FIREBASE_PROJECT_ID || "",
  storageBucket: self.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: self.FIREBASE_APP_ID || "",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, tag } = payload.data || payload.notification || {};
  
  self.registration.showNotification(title || '🍅 Pomodoro Timer', {
    body: body || 'Timer complete!',
    icon: icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: tag || 'pomodoro',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    requireInteraction: true,
    data: payload.data,
  });
});

// Handle notification click
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

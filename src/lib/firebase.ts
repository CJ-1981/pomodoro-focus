import type { FirebaseConfig } from '@/stores/pomodoro';

/**
 * Build a Firebase client config object from the store config,
 * falling back to env vars for any missing fields.
 */
export function getFirebaseClientConfig(config: FirebaseConfig) {
  return {
    apiKey: config.apiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: config.authDomain || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: config.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: config.storageBucket || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: config.messagingSenderId || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: config.appId || process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  };
}

export function isFirebaseConfigured(config: FirebaseConfig): boolean {
  return !!(config.apiKey && config.projectId && config.vapidKey);
}

export function hasServerKey(config: FirebaseConfig): boolean {
  return !!(
    config.serverKey || process.env.FIREBASE_SERVER_KEY
  );
}

/**
 * Write the Firebase config to the Cache API so the service worker
 * can read it when handling background push events.
 */
export async function cacheFirebaseConfigForSW(config: FirebaseConfig): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const cache = await caches.open('pomodoro-config');
    const clientConfig = getFirebaseClientConfig(config);
    await cache.put(
      '/firebase-config.json',
      new Response(JSON.stringify(clientConfig), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  } catch (e) {
    console.warn('Failed to cache Firebase config for SW:', e);
  }
}

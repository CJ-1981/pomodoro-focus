import type { FirebaseConfig } from '@/stores/pomodoro';
import {
  getFirebaseClientConfig,
  isFirebaseConfigured,
  cacheFirebaseConfigForSW,
} from './firebase';

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }
  const permission = await Notification.requestPermission();
  return permission;
}

export function hasNotificationPermission(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Initialize FCM using config from the store (localStorage).
 * Returns the FCM token on success, null otherwise.
 */
export async function initFCM(config: FirebaseConfig, retryCount = 3): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (!isFirebaseConfigured(config)) {
    console.warn('Firebase not configured. Using local notifications.');
    return null;
  }

  let attempt = 0;
  while (attempt < retryCount) {
    try {
      // 1. Check permission first
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        console.warn(`[Pomodoro] FCM initialization attempt ${attempt + 1}: Notification permission is ${Notification.permission}. Token retrieval may fail.`);
      }

      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { getMessaging, getToken } = await import('firebase/messaging');

      const clientConfig = getFirebaseClientConfig(config);
      const appName = 'pomodoro-fcm';
      const app = getApps().find((a) => a.name === appName) 
        ? getApp(appName) 
        : initializeApp(clientConfig, appName);
      const messaging = getMessaging(app);

      // 2. Ensure service worker is ready with timeout
      const swReadyPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Service worker ready timeout (10s)')), 10000)
      );
      
      const registration = await Promise.race([swReadyPromise, timeoutPromise]) as ServiceWorkerRegistration;
      if (!registration) {
        throw new Error('Service worker registration not found');
      }

      const token = await getToken(messaging, {
        vapidKey: config.vapidKey,
        serviceWorkerRegistration: registration,
      });

      // 3. Cache config for service worker background messaging
      await cacheFirebaseConfigForSW(config);

      // 4. Notify service worker about the new config
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'FIREBASE_CONFIG',
          config: clientConfig,
        });
      }

      // Log success
      console.log(
        `[Pomodoro] FCM initialized successfully on attempt ${attempt + 1}.`,
        'Token:', token
      );

      return token;
    } catch (error) {
      attempt++;
      console.warn(`[Pomodoro] FCM initialization attempt ${attempt} failed:`, error);
      if (attempt >= retryCount) {
        console.error('[Pomodoro] FCM initialization failed after max retries.');
        throw error;
      }
      // Wait before next attempt (backoff: 1s, 2s)
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  return null;
}

// Local notification fallback
export function sendLocalNotification(title: string, body: string, tag: string = 'pomodoro') {
  if (!hasNotificationPermission()) return;

  new Notification(title, {
    body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag,
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    requireInteraction: true,
  });
}

let audioContext: AudioContext | null = null;

export function resumeAudioContext() {
  if (typeof window === 'undefined') return;
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

// Alarm sound using Web Audio API
export function playAlarmSound(mode: 'work' | 'shortBreak' | 'longBreak' = 'work') {
  try {
    const ctx = resumeAudioContext();
    if (!ctx) return;

    const playBeep = (time: number, freq: number, duration: number, volume = 0.3, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = type;
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
      osc.start(time);
      osc.stop(time + duration);
    };

    const now = ctx.currentTime;

    if (mode === 'work') {
      // Energetic ascending pattern for work completion
      for (let i = 0; i < 3; i++) {
        playBeep(now + i * 0.3, 523.25, 0.2); // C5
        playBeep(now + i * 0.3 + 0.1, 659.25, 0.2); // E5
        playBeep(now + i * 0.3 + 0.2, 783.99, 0.2); // G5
      }
    } else if (mode === 'shortBreak') {
      // Gentle double-beep for short break completion
      playBeep(now, 440, 0.4, 0.2); // A4
      playBeep(now + 0.5, 440, 0.4, 0.2); // A4
    } else {
      // Celebratory deeper pattern for long break completion
      const baseFreq = 329.63; // E4
      playBeep(now, baseFreq, 0.5, 0.3, 'triangle');
      playBeep(now + 0.2, baseFreq * 1.25, 0.5, 0.3, 'triangle'); // G#4
      playBeep(now + 0.4, baseFreq * 1.5, 0.8, 0.3, 'triangle'); // B4
    }
  } catch (_e) {
    console.warn('Audio not available');
  }
}

// Vibration
export function triggerVibration(pattern: number | number[] = [200, 100, 200, 100, 200, 100, 200]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

// Full notification experience: sound + vibration + notification
export function notifyTimerComplete(type: 'work' | 'shortBreak' | 'longBreak') {
  const messages: Record<string, { title: string; body: string }> = {
    work: { title: '🍅 Work Session Complete!', body: 'Great job! Time for a break.' },
    shortBreak: { title: '☕ Break is Over!', body: 'Ready to focus again?' },
    longBreak: { title: '🎉 Long Break Over!', body: "Let's get back to work!" },
  };

  const msg = messages[type];
  
  // 1. Always show local notification in foreground/main thread
  sendLocalNotification(msg.title, msg.body);

  // 2. Only signal service worker if app is in background
  // This avoids double notifications when app is active
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TIMER_COMPLETE',
        notificationType: type,
      });
    }
  }
}

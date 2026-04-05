import { isFirebaseConfigured, firebaseConfig } from './firebase';

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

// Initialize FCM if Firebase is configured
export async function initFCM(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (!isFirebaseConfigured()) {
    console.warn('Firebase not configured. Using local notifications.');
    return null;
  }

  try {
    const { initializeApp } = await import('firebase/app');
    const { getMessaging, getToken } = await import('firebase/messaging');

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: firebaseConfig.vapidKey,
    });

    // Send token to our API
    await fetch('/api/fcm-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    return token;
  } catch (error) {
    console.error('FCM initialization failed:', error);
    return null;
  }
}

// Local notification fallback
export function sendLocalNotification(title: string, body: string, tag: string = 'pomodoro') {
  if (!hasNotificationPermission()) return;

  new Notification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag,
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    requireInteraction: true,
  });
}

// Alarm sound using Web Audio API
export function playAlarmSound() {
  try {
    const ctx = new AudioContext();

    const playBeep = (time: number, freq: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
      osc.start(time);
      osc.stop(time + duration);
    };

    const now = ctx.currentTime;
    // Play a pleasant ascending pattern
    for (let i = 0; i < 3; i++) {
      playBeep(now + i * 0.3, 523.25, 0.2); // C5
      playBeep(now + i * 0.3 + 0.1, 659.25, 0.2); // E5
    }

    // Clean up
    setTimeout(() => ctx.close(), 3000);
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
  sendLocalNotification(msg.title, msg.body);

  // Also try FCM push (in case we're in background and service worker is active)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'TIMER_COMPLETE',
      notificationType: type,
    });
  }
}

'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import { BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestNotificationPermission } from '@/lib/fcm';

type NotificationStatus = 'default' | 'granted' | 'denied' | 'unsupported' | 'loading';

// --- External store for Notification.permission ---
const listeners = new Set<() => void>();

function subscribePermission(callback: () => void) {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}

function getPermissionSnapshot(): NotificationStatus {
  if (typeof window === 'undefined') return 'loading';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function getServerSnapshot(): NotificationStatus {
  return 'loading';
}

function notifyPermissionListeners() {
  listeners.forEach((cb) => cb());
}

export function NotificationBanner() {
  const permission = useSyncExternalStore(
    subscribePermission,
    getPermissionSnapshot,
    getServerSnapshot
  );

  const [dismissed, setDismissed] = useState(false);

  const handleRequestPermission = useCallback(async () => {
    try {
      await requestNotificationPermission();
      notifyPermissionListeners();
      if (typeof window !== 'undefined' && Notification.permission === 'granted') {
        setTimeout(() => setDismissed(true), 2000);
      }
    } catch {
      notifyPermissionListeners();
    }
  }, []);

  // Don't show if permission already granted, unsupported, or dismissed
  if (permission === 'loading' || permission === 'granted' || permission === 'unsupported' || dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 bg-muted/60 border border-border rounded-xl px-4 py-3"
    >
      <div className="flex-shrink-0">
        <BellRing className="h-4 w-4 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">
          {permission === 'denied'
            ? 'Notifications are blocked. Enable them in browser settings for timer alerts.'
            : 'Enable notifications to get timer alerts even when the app is in background.'}
        </p>
      </div>
      {permission !== 'denied' && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-xs font-semibold rounded-lg bg-secondary hover:bg-accent text-foreground flex-shrink-0"
          onClick={handleRequestPermission}
        >
          Enable
        </Button>
      )}
      {permission === 'denied' && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-xs text-muted-foreground/60 flex-shrink-0"
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </Button>
      )}
    </motion.div>
  );
}

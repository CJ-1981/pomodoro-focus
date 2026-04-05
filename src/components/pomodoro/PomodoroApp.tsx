'use client';

import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import { usePomodoroStore } from '@/stores/pomodoro';
import { notifyTimerComplete, playAlarmSound, triggerVibration, initFCM } from '@/lib/fcm';
import { CircularTimer } from './CircularTimer';
import { TimerControls } from './TimerControls';
import { SessionTracker } from './SessionTracker';
import { SettingsSheet } from './SettingsSheet';
import { NotificationBanner } from './NotificationBanner';

const MODE_TABS = [
  { key: 'work' as const, label: 'Focus', emoji: '🍅' },
  { key: 'shortBreak' as const, label: 'Short Break', emoji: '☕' },
  { key: 'longBreak' as const, label: 'Long Break', emoji: '🌿' },
];

export function PomodoroApp() {
  const {
    mode,
    timerState,
    settings,
    completedWorkSessions,
    firebaseConfig,
    fcmStatus,
    switchMode,
    startTimer,
    tick,
    setFcmStatus,
  } = usePomodoroStore();

  const [hydrated] = useSyncExternalStore(
    (callback) => {
      if (usePomodoroStore.persist.hasHydrated()) {
        return () => {};
      }
      const handler = () => callback();
      usePomodoroStore.persist.onFinishHydration(handler);
      return () => {};
    },
    () => usePomodoroStore.persist.hasHydrated(),
    () => false
  );

  const prevCompletedRef = useRef(completedWorkSessions);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Main timer tick - runs every 100ms for smooth updates
  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        tick();
      }, 100); // 100ms for smooth countdown
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState, tick]);

  // Watch for timer completion
  useEffect(() => {
    if (timerState === 'completed') {
      // Determine which timer just completed based on mode change
      const currentMode = mode;

      if (settings.soundEnabled) playAlarmSound();
      if (settings.vibrationEnabled) triggerVibration();
      if (settings.notificationsEnabled) {
        // Determine which type was completed - if mode changed, the previous was completed
        const prevMode = prevCompletedRef.current;
        notifyTimerComplete(currentMode);
      }

      // Auto-start next session if enabled
      if (currentMode === 'shortBreak' && settings.autoStartBreaks) {
        const timeout = setTimeout(() => {
          startTimer();
        }, 1500);
        return () => clearTimeout(timeout);
      } else if (currentMode === 'longBreak' && settings.autoStartBreaks) {
        const timeout = setTimeout(() => {
          startTimer();
        }, 1500);
        return () => clearTimeout(timeout);
      } else if (currentMode === 'work' && settings.autoStartWork) {
        const timeout = setTimeout(() => {
          startTimer();
        }, 1500);
        return () => clearTimeout(timeout);
      }
    }
  }, [timerState, mode, settings, startTimer]);

  // Track completed sessions
  useEffect(() => {
    prevCompletedRef.current = completedWorkSessions;
  }, [completedWorkSessions]);

  // Auto-init FCM when stored config is available after hydration
  useEffect(() => {
    if (!hydrated) return;
    const isConfigured =
      !!firebaseConfig.apiKey && !!firebaseConfig.projectId && !!firebaseConfig.vapidKey;
    if (isConfigured && fcmStatus === 'disconnected') {
      setFcmStatus('connecting');
      initFCM(firebaseConfig)
        .then(() => setFcmStatus('connected'))
        .catch(() => setFcmStatus('error'));
    }
  }, [hydrated, firebaseConfig.apiKey, firebaseConfig.projectId, firebaseConfig.vapidKey, fcmStatus, setFcmStatus]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }
  }, []);

  const handleModeSwitch = useCallback(
    (newMode: typeof MODE_TABS[number]['key']) => {
      if (timerState === 'running' || timerState === 'paused') {
        // Allow switching even during running timer
      }
      switchMode(newMode);
    },
    [timerState, switchMode]
  );

  return (
    <div className="min-h-[100dvh] bg-[#0f0f23] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6 pb-2 safe-area-top">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍅</span>
          <h1 className="text-lg font-bold text-white/90">Pomodoro</h1>
        </div>
        <SettingsSheet />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 gap-8 -mt-4">
        {/* Mode Tabs */}
        <motion.div
          className="flex items-center gap-1 bg-white/5 rounded-xl p-1"
          layout
        >
          {MODE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleModeSwitch(tab.key)}
              className={`relative px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                mode === tab.key
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {mode === tab.key && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background:
                      tab.key === 'work'
                        ? 'rgba(231, 76, 60, 0.2)'
                        : tab.key === 'shortBreak'
                          ? 'rgba(26, 188, 156, 0.2)'
                          : 'rgba(52, 152, 219, 0.2)',
                    border: `1px solid ${
                      tab.key === 'work'
                        ? 'rgba(231, 76, 60, 0.3)'
                        : tab.key === 'shortBreak'
                          ? 'rgba(26, 188, 156, 0.3)'
                          : 'rgba(52, 152, 219, 0.3)'
                    }`,
                  }}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">
                {tab.emoji} {tab.label}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Circular Timer */}
        <CircularTimer />

        {/* Controls */}
        <TimerControls />

        {/* Session Tracker */}
        <SessionTracker />
      </main>

      {/* Footer */}
      <footer className="px-5 pb-6 pt-2 safe-area-bottom">
        <NotificationBanner />
      </footer>
    </div>
  );
}

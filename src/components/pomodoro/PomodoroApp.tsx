'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { usePomodoroStore } from '@/stores/pomodoro';
import { notifyTimerComplete, playAlarmSound, triggerVibration, initFCM } from '@/lib/fcm';
import { CircularTimer } from './CircularTimer';
import { TimerControls } from './TimerControls';
import { SessionTracker } from './SessionTracker';
import { SettingsSheet } from './SettingsSheet';
import { NotificationBanner } from './NotificationBanner';
import { ThemeToggle } from './ThemeToggle';

const MODE_TABS = [
  { key: 'work' as const, label: 'Focus' },
  { key: 'shortBreak' as const, label: 'Short Break' },
  { key: 'longBreak' as const, label: 'Long Break' },
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

  const fcmInitRef = useRef(false);
  const prevCompletedRef = useRef(completedWorkSessions);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Main timer tick - runs every 100ms for smooth updates
  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        tick();
      }, 100);
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
      const currentMode = mode;

      if (settings.soundEnabled) playAlarmSound();
      if (settings.vibrationEnabled) triggerVibration();
      if (settings.notificationsEnabled) {
        notifyTimerComplete(currentMode);
      }

      // Auto-start next session if enabled
      if (
        (currentMode === 'shortBreak' || currentMode === 'longBreak') &&
        settings.autoStartBreaks
      ) {
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

  // Auto-init FCM once after mount when stored config is available
  useEffect(() => {
    if (fcmInitRef.current) return;
    fcmInitRef.current = true;

    const isConfigured =
      !!firebaseConfig.apiKey && !!firebaseConfig.projectId && !!firebaseConfig.vapidKey;
    if (isConfigured && fcmStatus === 'disconnected') {
      setFcmStatus('connecting');
      initFCM(firebaseConfig)
        .then(() => setFcmStatus('connected'))
        .catch(() => setFcmStatus('error'));
    }
  });

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
      switchMode(newMode);
    },
    [switchMode]
  );

  const getAccentBg = (tabKey: string) => {
    switch (tabKey) {
      case 'work': return 'bg-pomodoro-work/10 border-pomodoro-work/20 text-pomodoro-work';
      case 'shortBreak': return 'bg-pomodoro-short/10 border-pomodoro-short/20 text-pomodoro-short';
      case 'longBreak': return 'bg-pomodoro-long/10 border-pomodoro-long/20 text-pomodoro-long';
      default: return '';
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-6 pb-2 safe-area-top">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-pomodoro-work flex items-center justify-center">
            <span className="text-sm">🍅</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Pomodoro</h1>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <SettingsSheet />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-10 -mt-4">
        {/* Mode Tabs */}
        <motion.div
          className="flex items-center gap-1 bg-muted/60 rounded-xl p-1 border border-border/50"
          layout
        >
          {MODE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleModeSwitch(tab.key)}
              className={`relative px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === tab.key
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground/70'
              }`}
            >
              {mode === tab.key && (
                <motion.div
                  layoutId="activeTab"
                  className={`absolute inset-0 rounded-lg border ${getAccentBg(tab.key)}`}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
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
      <footer className="px-6 pb-6 pt-2 safe-area-bottom">
        <NotificationBanner />
      </footer>
    </div>
  );
}

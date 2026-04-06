'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Github } from 'lucide-react';
import { usePomodoroStore } from '@/stores/pomodoro';
import { logger } from '@/lib/logger';
import { notifyTimerComplete, playAlarmSound, triggerVibration, initFCM, resumeAudioContext } from '@/lib/fcm';
import { CircularTimer } from './CircularTimer';
import { TimerControls } from './TimerControls';
import { SessionTracker } from './SessionTracker';
import { SettingsSheet } from './SettingsSheet';
import { NotificationBanner } from './NotificationBanner';
import { ThemeToggle } from './ThemeToggle';
import { PWAInstallPrompt } from './PWAInstallPrompt';

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
    modeStates,
    completedWorkSessions,
    lastCompletedMode,
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
  const lastNotifiedAtRef = useRef<Record<string, number>>({
    work: 0,
    shortBreak: 0,
    longBreak: 0,
  });

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

  // Watch for timer completion in any mode
  useEffect(() => {
    const states = usePomodoroStore.getState().modeStates;
    Object.entries(states).forEach(([m, state]) => {
      const modeKey = m as keyof typeof states;
      if (
        state.timerState === 'completed' &&
        state.completedAt &&
        state.completedAt > lastNotifiedAtRef.current[modeKey]
      ) {
        lastNotifiedAtRef.current[modeKey] = state.completedAt;
        
        logger.log(`[PomodoroApp] New completion detected for mode: ${modeKey}. Playing alerts.`);

        if (settings.soundEnabled) playAlarmSound(modeKey);
        if (settings.vibrationEnabled) triggerVibration();
        if (settings.notificationsEnabled) {
          notifyTimerComplete(modeKey);
        }

        // Auto-start next session if this is the active mode
        if (modeKey === lastCompletedMode || modeKey === mode) {
          if (
            (mode === 'shortBreak' || mode === 'longBreak') &&
            settings.autoStartBreaks
          ) {
            logger.log(`[PomodoroApp] Auto-starting break session`);
            const timeout = setTimeout(() => {
              startTimer();
            }, 1500);
            return () => clearTimeout(timeout);
          } else if (mode === 'work' && settings.autoStartWork) {
            logger.log(`[PomodoroApp] Auto-starting work session`);
            const timeout = setTimeout(() => {
              startTimer();
            }, 1500);
            return () => clearTimeout(timeout);
          }
        }
      }
    });
  }, [modeStates, mode, lastCompletedMode, settings, startTimer]);

  // Track completed sessions
  useEffect(() => {
    if (prevCompletedRef.current !== completedWorkSessions) {
      logger.log(`[PomodoroApp] Completed work sessions changed: ${prevCompletedRef.current} -> ${completedWorkSessions}`);
      prevCompletedRef.current = completedWorkSessions;
    }
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
        .register('./sw.js')
        .then((registration) => {
          logger.log('Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          logger.log('Service Worker registration failed:', error);
        });
    }
  }, []);

  const handleModeSwitch = useCallback(
    (newMode: typeof MODE_TABS[number]['key']) => {
      switchMode(newMode);
    },
    [switchMode]
  );

  const handleSwipe = useCallback(
    (_event: any, info: any) => {
      const threshold = 50;
      const { offset } = info;

      // If vertical movement is greater than horizontal, it's a scroll, not a swipe
      if (Math.abs(offset.y) > Math.abs(offset.x)) return;

      const currentIndex = MODE_TABS.findIndex((tab) => tab.key === mode);

      if (offset.x < -threshold) {
        // Swipe Left -> Next Tab
        const nextIndex = (currentIndex + 1) % MODE_TABS.length;
        logger.log(`[PomodoroApp] Swiped left. Switching to: ${MODE_TABS[nextIndex].key}`);
        handleModeSwitch(MODE_TABS[nextIndex].key);
      } else if (offset.x > threshold) {
        // Swipe Right -> Prev Tab
        const prevIndex = (currentIndex - 1 + MODE_TABS.length) % MODE_TABS.length;
        logger.log(`[PomodoroApp] Swiped right. Switching to: ${MODE_TABS[prevIndex].key}`);
        handleModeSwitch(MODE_TABS[prevIndex].key);
      }
    },
    [mode, handleModeSwitch]
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
    <div 
      className="fixed inset-0 bg-background text-foreground flex flex-col overflow-hidden"
      onClick={() => resumeAudioContext()}
    >
      {/* Header + Mode Tabs */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 border-b border-border/5">
        <header className="flex items-center justify-between px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pomodoro-work flex items-center justify-center shadow-sm">
              <span className="text-base">🍅</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Pomodoro</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SettingsSheet />
          </div>
        </header>

        {/* Mode Tabs — pinned below header, never overlaps */}
        <div className="flex justify-center px-5 pt-1 pb-2">
          <motion.div
            className="flex items-center gap-1 bg-muted/60 rounded-xl p-1 border border-border/50"
            layout
          >
            {MODE_TABS.map((tab) => {
              const ms = modeStates[tab.key];
              const progress = ms.totalTime > 0 ? (ms.remainingMs / ms.totalTime) * 100 : 0;
              const isRunning = ms.timerState === 'running';

              return (
                <button
                  key={tab.key}
                  onClick={() => handleModeSwitch(tab.key)}
                  className={`relative px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
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
                  
                  {/* Progress Indicator Bar */}
                  <div className="relative z-10 w-8 h-0.5 mt-0.5 rounded-full bg-muted overflow-hidden">
                    <motion.div 
                      className={`h-full ${
                        tab.key === 'work' ? 'bg-pomodoro-work' : 
                        tab.key === 'shortBreak' ? 'bg-pomodoro-short' : 
                        'bg-pomodoro-long'
                      } ${isRunning ? 'opacity-100' : 'opacity-40'}`}
                      initial={false}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: 'linear' }}
                    />
                  </div>
                </button>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Main Content — Scrollable if content exceeds viewport height */}
      <motion.main
        className="flex-1 flex flex-col items-center px-5 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-none touch-pan-y"
        onPanEnd={handleSwipe}
      >
        <div className="flex-1 w-full max-w-md mx-auto flex flex-col items-center gap-4 py-2 sm:py-4 scale-95 origin-top">
          {/* Container to maintain centering when scrolling is not needed */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 sm:gap-6 w-full pointer-events-none">
            <div className="pointer-events-auto flex flex-col items-center gap-4 sm:gap-6 w-full">
              {/* Circular Timer */}
              <CircularTimer />

              {/* Controls */}
              <TimerControls />

              {/* Session Tracker */}
              <SessionTracker />
            </div>
          </div>

          {/* Bottom Elements — scrollable part of the main view */}
          <div className="w-full flex flex-col items-center gap-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
            <NotificationBanner />
            <a
              href="https://github.com/CJ-1981/pomodoro-focus"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/40 hover:text-foreground transition-colors py-1"
            >
              <Github className="h-3 w-3" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </motion.main>

      <PWAInstallPrompt />
    </div>
  );
}

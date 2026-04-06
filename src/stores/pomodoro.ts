import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '@/lib/logger';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';
type TimerState = 'idle' | 'running' | 'paused' | 'completed';
type FcmStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
  serverKey: string;
}

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  vapidKey: '',
  serverKey: '',
};

export interface PomodoroSettings {
  workDuration: number; // minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number; // after how many work sessions
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  notificationsEnabled: boolean;
}

interface ModeState {
  timerState: TimerState;
  endTime: number | null;
  remainingMs: number;
  totalTime: number;
  completedAt: number | null;
}

interface PomodoroState {
  // Timer state
  mode: TimerMode;
  timerState: TimerState;
  endTime: number | null; // Unix timestamp when timer should end
  remainingMs: number; // Calculated remaining time
  totalTime: number; // Total duration for current timer in ms
  lastCompletedMode: TimerMode | null; // Track which mode just finished for notifications

  // Mode-specific states to allow switching without resetting
  modeStates: Record<TimerMode, ModeState>;

  // Session tracking
  completedWorkSessions: number;
  totalCompletedToday: number;

  // Settings
  settings: PomodoroSettings;

  // Firebase / FCM
  firebaseConfig: FirebaseConfig;
  fcmStatus: FcmStatus;
  _hasHydrated: boolean;

  // Actions
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  switchMode: (mode: TimerMode) => void;
  timerComplete: () => void;
  updateRemaining: () => void;
  updateSettings: (settings: Partial<PomodoroSettings>) => void;
  resetSettings: () => void;
  updateFirebaseConfig: (config: Partial<FirebaseConfig>) => void;
  setFcmStatus: (status: FcmStatus) => void;
  tick: () => void; // Called every second
  resetDayStats: () => void;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true,
  vibrationEnabled: true,
  notificationsEnabled: true,
};

function getDurationForMode(mode: TimerMode, settings: PomodoroSettings): number {
  switch (mode) {
    case 'work': return settings.workDuration * 60 * 1000;
    case 'shortBreak': return settings.shortBreakDuration * 60 * 1000;
    case 'longBreak': return settings.longBreakDuration * 60 * 1000;
  }
}

function createInitialModeStates(settings: PomodoroSettings): Record<TimerMode, ModeState> {
  return {
    work: {
      timerState: 'idle',
      endTime: null,
      remainingMs: settings.workDuration * 60 * 1000,
      totalTime: settings.workDuration * 60 * 1000,
      completedAt: null,
    },
    shortBreak: {
      timerState: 'idle',
      endTime: null,
      remainingMs: settings.shortBreakDuration * 60 * 1000,
      totalTime: settings.shortBreakDuration * 60 * 1000,
      completedAt: null,
    },
    longBreak: {
      timerState: 'idle',
      endTime: null,
      remainingMs: settings.longBreakDuration * 60 * 1000,
      totalTime: settings.longBreakDuration * 60 * 1000,
      completedAt: null,
    },
  };
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      mode: 'work',
      timerState: 'idle',
      endTime: null,
      remainingMs: DEFAULT_SETTINGS.workDuration * 60 * 1000,
      totalTime: DEFAULT_SETTINGS.workDuration * 60 * 1000,
      lastCompletedMode: null,
      modeStates: createInitialModeStates(DEFAULT_SETTINGS),
      completedWorkSessions: 0,
      totalCompletedToday: 0,
      settings: DEFAULT_SETTINGS,
      firebaseConfig: DEFAULT_FIREBASE_CONFIG,
      fcmStatus: 'disconnected' as FcmStatus,
      _hasHydrated: false,

      startTimer: () => {
        const { mode, settings, modeStates } = get();
        logger.log(`[Pomodoro] Starting timer for mode: ${mode}`);
        const duration = getDurationForMode(mode, settings);
        const endTime = Date.now() + duration;
        const newState = {
          timerState: 'running' as TimerState,
          endTime,
          totalTime: duration,
          remainingMs: duration,
        };
        set({
          ...newState,
          modeStates: {
            ...modeStates,
            [mode]: newState,
          },
        });
      },

      pauseTimer: () => {
        const { mode, modeStates, remainingMs } = get();
        logger.log(`[Pomodoro] Pausing timer for mode: ${mode}`);
        const newState = { timerState: 'paused' as TimerState, endTime: null, remainingMs };
        set({
          timerState: 'paused',
          endTime: null,
          modeStates: {
            ...modeStates,
            [mode]: { ...modeStates[mode], ...newState },
          },
        });
      },

      resumeTimer: () => {
        const { mode, modeStates, remainingMs } = get();
        logger.log(`[Pomodoro] Resuming timer for mode: ${mode}`);
        const endTime = Date.now() + remainingMs;
        const newState = { timerState: 'running' as TimerState, endTime };
        set({
          timerState: 'running',
          endTime,
          modeStates: {
            ...modeStates,
            [mode]: { ...modeStates[mode], ...newState },
          },
        });
      },

      resetTimer: () => {
        const { mode, settings, modeStates } = get();
        logger.log(`[Pomodoro] Resetting timer for mode: ${mode}`);
        const duration = getDurationForMode(mode, settings);
        const newState = {
          timerState: 'idle' as TimerState,
          endTime: null,
          remainingMs: duration,
          totalTime: duration,
        };
        set({
          ...newState,
          modeStates: {
            ...modeStates,
            [mode]: newState,
          },
        });
      },

      switchMode: (newMode: TimerMode) => {
        const { mode, modeStates, timerState, endTime, remainingMs, totalTime } = get();
        
        // If switching to the same mode, do nothing (prevents reset)
        if (newMode === mode) return;

        logger.log(`[Pomodoro] Switching mode from ${mode} to ${newMode}`);

        // Save current state
        const updatedModeStates = {
          ...modeStates,
          [mode]: { timerState, endTime, remainingMs, totalTime },
        };

        // Load next state
        const nextState = updatedModeStates[newMode];

        set({
          mode: newMode,
          modeStates: updatedModeStates,
          timerState: nextState.timerState,
          endTime: nextState.endTime,
          remainingMs: nextState.remainingMs,
          totalTime: nextState.totalTime,
        });
      },

      timerComplete: () => {
        const { mode, completedWorkSessions, settings, modeStates } = get();
        logger.log(`[Pomodoro] Timer complete for mode: ${mode}`);
        
        let newCompletedWorkSessions = completedWorkSessions;
        let newTotalCompletedToday = get().totalCompletedToday;

        if (mode === 'work') {
          newCompletedWorkSessions = completedWorkSessions + 1;
          newTotalCompletedToday += 1;
        }

        // Reset the mode that just completed
        const completedModeDuration = getDurationForMode(mode, settings);
        const resetCompletedMode: ModeState = {
          timerState: 'completed',
          endTime: null,
          remainingMs: 0,
          totalTime: completedModeDuration,
          completedAt: Date.now(),
        };

        const updatedModeStates = {
          ...modeStates,
          [mode]: resetCompletedMode,
        };

        set({
          timerState: 'completed',
          completedWorkSessions: newCompletedWorkSessions,
          totalCompletedToday: newTotalCompletedToday,
          lastCompletedMode: mode,
          endTime: null,
          remainingMs: 0,
          modeStates: updatedModeStates,
        });
      },

      updateRemaining: () => {
        const { mode, modeStates, timerState, endTime } = get();
        const now = Date.now();
        let stateChanged = false;
        const newModeStates = { ...modeStates };

        // 1. Update all running timers in modeStates
        (Object.keys(newModeStates) as TimerMode[]).forEach((m) => {
          const ms = newModeStates[m];
          if (ms.timerState === 'running' && ms.endTime) {
            const remaining = ms.endTime - now;
            if (remaining <= 0) {
              // This timer finished!
              logger.log(`[Pomodoro] Background timer finished for mode: ${m}`);
              const duration = getDurationForMode(m, get().settings);
              newModeStates[m] = {
                timerState: 'completed',
                endTime: null,
                remainingMs: 0,
                totalTime: duration,
                completedAt: now,
              };
              
              // If this was the active mode, we'll trigger timerComplete later
              if (m === mode) {
                stateChanged = true;
              } else {
                // If it was NOT the active mode, we still need to handle completion (e.g. notifications)
                // However, timerComplete() currently assumes it's the active mode.
                // For simplicity, we just mark it completed in modeStates.
                // The user will see it's complete when they switch back.
              }
            } else {
              newModeStates[m] = {
                ...ms,
                remainingMs: remaining,
              };
              if (m === mode) stateChanged = true;
            }
          }
        });

        // 2. Sync active mode state to top-level if needed
        if (stateChanged || (timerState === 'running' && endTime)) {
          const currentModeState = newModeStates[mode];
          
          if (currentModeState.timerState === 'completed' && currentModeState.remainingMs === 0) {
             set({ modeStates: newModeStates });
             get().timerComplete();
          } else {
            set({
              remainingMs: currentModeState.remainingMs,
              modeStates: newModeStates,
            });
          }
        }
      },

      updateSettings: (newSettings) => {
        const { mode, timerState, settings, modeStates } = get();
        const merged = { ...settings, ...newSettings };
        
        // Update all mode durations in modeStates if they are currently not running
        const updatedModeStates = { ...modeStates };
        (Object.keys(updatedModeStates) as TimerMode[]).forEach((m) => {
          if (updatedModeStates[m].timerState === 'idle' || updatedModeStates[m].timerState === 'completed') {
            const duration = getDurationForMode(m, merged);
            updatedModeStates[m] = {
              ...updatedModeStates[m],
              timerState: 'idle', // Reset completed state to idle when duration changes
              remainingMs: duration,
              totalTime: duration,
              endTime: null,
            };
          }
        });

        // If current timer is not running, update top-level state too
        if (timerState === 'idle' || timerState === 'completed') {
          const duration = getDurationForMode(mode, merged);
          set({ 
            settings: merged, 
            timerState: 'idle',
            remainingMs: duration, 
            totalTime: duration,
            endTime: null,
            modeStates: updatedModeStates,
          });
        } else {
          set({ settings: merged, modeStates: updatedModeStates });
        }
      },

      resetSettings: () => {
        const { mode, timerState } = get();
        const newModeStates = createInitialModeStates(DEFAULT_SETTINGS);
        
        if (timerState === 'idle' || timerState === 'completed') {
          const duration = getDurationForMode(mode, DEFAULT_SETTINGS);
          set({
            settings: DEFAULT_SETTINGS,
            modeStates: newModeStates,
            timerState: 'idle',
            remainingMs: duration,
            totalTime: duration,
            endTime: null,
          });
        } else {
          set({
            settings: DEFAULT_SETTINGS,
            modeStates: newModeStates,
          });
        }
      },

      updateFirebaseConfig: (newConfig) => {
        const { firebaseConfig } = get();
        const merged = { ...firebaseConfig, ...newConfig };
        set({ firebaseConfig: merged, fcmStatus: 'disconnected' as FcmStatus });
      },

      setFcmStatus: (status) => {
        set({ fcmStatus: status });
      },

      tick: () => {
        const { timerState } = get();
        if (timerState === 'running') {
          get().updateRemaining();
        }
      },

      resetDayStats: () => {
        set({
          completedWorkSessions: 0,
          totalCompletedToday: 0,
        });
      },
    }),
    {
      name: 'pomodoro-storage',
      onRehydrateStorage: (state) => {
        return (hydratedState, error) => {
          if (error || !hydratedState) {
            state._hasHydrated = true;
            return;
          }

          // Check if timer was running when app closed
          if (hydratedState.timerState === 'running' && hydratedState.endTime) {
            const now = Date.now();
            const remaining = hydratedState.endTime - now;

            if (remaining <= 0) {
              // Timer finished while app was closed
              hydratedState.remainingMs = 0;
              hydratedState.timerComplete();
            } else {
              hydratedState.remainingMs = remaining;
            }
          }

          hydratedState._hasHydrated = true;
        };
      },
      partialize: (state) => ({
        mode: state.mode,
        timerState: state.timerState,
        endTime: state.endTime,
        remainingMs: state.remainingMs,
        totalTime: state.totalTime,
        modeStates: state.modeStates,
        completedWorkSessions: state.completedWorkSessions,
        totalCompletedToday: state.totalCompletedToday,
        settings: state.settings,
        firebaseConfig: state.firebaseConfig,
      }),
    }
  )
);

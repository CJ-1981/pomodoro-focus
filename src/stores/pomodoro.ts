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

  // Actions
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  switchMode: (mode: TimerMode) => void;
  timerComplete: () => void;
  updateRemaining: () => void;
  updateSettings: (settings: Partial<PomodoroSettings>) => void;
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
    },
    shortBreak: {
      timerState: 'idle',
      endTime: null,
      remainingMs: settings.shortBreakDuration * 60 * 1000,
      totalTime: settings.shortBreakDuration * 60 * 1000,
    },
    longBreak: {
      timerState: 'idle',
      endTime: null,
      remainingMs: settings.longBreakDuration * 60 * 1000,
      totalTime: settings.longBreakDuration * 60 * 1000,
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
        let nextMode: TimerMode = mode;
        let newCompletedWorkSessions = completedWorkSessions;
        let newTotalCompletedToday = get().totalCompletedToday;

        if (mode === 'work') {
          newCompletedWorkSessions = completedWorkSessions + 1;
          newTotalCompletedToday += 1;
          nextMode = newCompletedWorkSessions % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
        } else {
          nextMode = 'work';
        }

        logger.log(`[Pomodoro] Next mode will be: ${nextMode}`);

        // Reset the mode that just completed to idle/default
        const completedModeDuration = getDurationForMode(mode, settings);
        const resetCompletedMode: ModeState = {
          timerState: 'completed',
          endTime: null,
          remainingMs: 0,
          totalTime: completedModeDuration,
        };

        // Also prepare the next mode if it was idle
        const nextModeDuration = getDurationForMode(nextMode, settings);
        const nextState = modeStates[nextMode];
        
        // Save states
        const updatedModeStates = {
          ...modeStates,
          [mode]: resetCompletedMode,
        };

        const finalNextRemaining = nextState.timerState === 'idle' ? nextModeDuration : nextState.remainingMs;
        const finalNextTotal = nextState.timerState === 'idle' ? nextModeDuration : nextState.totalTime;

        set({
          timerState: 'completed',
          completedWorkSessions: newCompletedWorkSessions,
          totalCompletedToday: newTotalCompletedToday,
          mode: nextMode,
          lastCompletedMode: mode,
          endTime: null,
          remainingMs: finalNextRemaining,
          totalTime: finalNextTotal,
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
        
        // Update all mode durations in modeStates if they are currently idle
        const updatedModeStates = { ...modeStates };
        (Object.keys(updatedModeStates) as TimerMode[]).forEach((m) => {
          if (updatedModeStates[m].timerState === 'idle') {
            const duration = getDurationForMode(m, merged);
            updatedModeStates[m] = {
              ...updatedModeStates[m],
              remainingMs: duration,
              totalTime: duration,
            };
          }
        });

        // If current timer is idle, update top-level remaining time too
        if (timerState === 'idle') {
          const duration = getDurationForMode(mode, merged);
          set({ 
            settings: merged, 
            remainingMs: duration, 
            totalTime: duration,
            modeStates: updatedModeStates,
          });
        } else {
          set({ settings: merged, modeStates: updatedModeStates });
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
          if (error || !hydratedState) return;

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

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
        const { mode, settings } = get();
        const duration = getDurationForMode(mode, settings);
        const endTime = Date.now() + duration;
        set({
          timerState: 'running',
          endTime,
          totalTime: duration,
          remainingMs: duration,
        });
      },

      pauseTimer: () => {
        set({ timerState: 'paused', endTime: null });
      },

      resumeTimer: () => {
        const { remainingMs } = get();
        const endTime = Date.now() + remainingMs;
        set({ timerState: 'running', endTime });
      },

      resetTimer: () => {
        const { mode, settings, modeStates } = get();
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

        set({
          timerState: 'completed',
          completedWorkSessions: newCompletedWorkSessions,
          totalCompletedToday: newTotalCompletedToday,
          mode: nextMode,
          lastCompletedMode: mode,
          endTime: null,
          remainingMs: nextState.timerState === 'idle' ? nextModeDuration : nextState.remainingMs,
          totalTime: nextState.timerState === 'idle' ? nextModeDuration : nextState.totalTime,
          modeStates: updatedModeStates,
        });
      },

      updateRemaining: () => {
        const { endTime, timerState } = get();
        if (timerState !== 'running' || !endTime) return;

        const remaining = endTime - Date.now();
        if (remaining <= 0) {
          set({ remainingMs: 0 });
          get().timerComplete();
        } else {
          set({ remainingMs: remaining });
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

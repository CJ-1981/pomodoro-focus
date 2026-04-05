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

interface PomodoroState {
  // Timer state
  mode: TimerMode;
  timerState: TimerState;
  endTime: number | null; // Unix timestamp when timer should end
  remainingMs: number; // Calculated remaining time
  totalTime: number; // Total duration for current timer in ms

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

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      mode: 'work',
      timerState: 'idle',
      endTime: null,
      remainingMs: DEFAULT_SETTINGS.workDuration * 60 * 1000,
      totalTime: DEFAULT_SETTINGS.workDuration * 60 * 1000,
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
        const { remainingMs } = get();
        set({ timerState: 'paused', endTime: null });
      },

      resumeTimer: () => {
        const { remainingMs } = get();
        const endTime = Date.now() + remainingMs;
        set({ timerState: 'running', endTime });
      },

      resetTimer: () => {
        const { mode, settings } = get();
        const duration = getDurationForMode(mode, settings);
        set({
          timerState: 'idle',
          endTime: null,
          remainingMs: duration,
          totalTime: duration,
        });
      },

      switchMode: (mode: TimerMode) => {
        const { settings } = get();
        const duration = getDurationForMode(mode, settings);
        set({
          mode,
          timerState: 'idle',
          endTime: null,
          remainingMs: duration,
          totalTime: duration,
        });
      },

      timerComplete: () => {
        const { mode, completedWorkSessions, settings } = get();

        if (mode === 'work') {
          const newCount = completedWorkSessions + 1;
          const nextMode: TimerMode =
            newCount % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak';

          set({
            timerState: 'completed',
            completedWorkSessions: newCount,
            totalCompletedToday: get().totalCompletedToday + 1,
            mode: nextMode,
            endTime: null,
          });
        } else {
          set({
            timerState: 'completed',
            mode: 'work',
            endTime: null,
          });
        }
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
        const { mode, timerState, settings } = get();
        const merged = { ...settings, ...newSettings };

        // If timer is idle, update the remaining time
        if (timerState === 'idle') {
          const duration = getDurationForMode(mode, merged);
          set({ settings: merged, remainingMs: duration, totalTime: duration });
        } else {
          set({ settings: merged });
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
      partialize: (state) => ({
        completedWorkSessions: state.completedWorkSessions,
        totalCompletedToday: state.totalCompletedToday,
        settings: state.settings,
        firebaseConfig: state.firebaseConfig,
      }),
    }
  )
);

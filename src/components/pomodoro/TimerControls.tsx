'use client';

import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePomodoroStore } from '@/stores/pomodoro';
import { notifyTimerComplete, playAlarmSound, triggerVibration } from '@/lib/fcm';

const MODE_GRADIENTS = {
  work: {
    from: 'from-pomodoro-work',
    to: 'to-red-700',
    shadow: 'shadow-pomodoro-work/30',
  },
  shortBreak: {
    from: 'from-pomodoro-short',
    to: 'to-emerald-700',
    shadow: 'shadow-pomodoro-short/30',
  },
  longBreak: {
    from: 'from-pomodoro-long',
    to: 'to-indigo-700',
    shadow: 'shadow-pomodoro-long/30',
  },
};

export function TimerControls() {
  const {
    timerState,
    mode,
    settings,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    timerComplete,
    completedWorkSessions,
  } = usePomodoroStore();

  const isRunning = timerState === 'running';
  const isPaused = timerState === 'paused';
  const isIdle = timerState === 'idle' || timerState === 'completed';

  const handleMainAction = () => {
    if (isIdle || timerState === 'completed') {
      startTimer();
    } else if (isRunning) {
      pauseTimer();
    } else if (isPaused) {
      resumeTimer();
    }
  };

  const handleReset = () => {
    resetTimer();
  };

  const handleSkip = () => {
    if (settings.soundEnabled) playAlarmSound();
    if (settings.vibrationEnabled) triggerVibration();
    if (settings.notificationsEnabled) {
      notifyTimerComplete(mode);
    }
    timerComplete();
  };

  const gradient = MODE_GRADIENTS[mode];

  return (
    <div className="flex items-center justify-center gap-5">
      {/* Reset button */}
      <motion.div whileTap={{ scale: 0.9 }}>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          onClick={handleReset}
          disabled={timerState === 'idle'}
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
      </motion.div>

      {/* Main play/pause button */}
      <motion.div whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.05 }}>
        <Button
          size="icon"
          className={`h-[72px] w-[72px] rounded-full text-white shadow-lg transition-all duration-300 hover:shadow-xl bg-gradient-to-br ${gradient.from} ${gradient.to} ${gradient.shadow}`}
          onClick={handleMainAction}
        >
          {isRunning ? (
            <Pause className="h-7 w-7" fill="currentColor" />
          ) : (
            <Play className="h-7 w-7 ml-1" fill="currentColor" />
          )}
        </Button>
      </motion.div>

      {/* Skip button */}
      <motion.div whileTap={{ scale: 0.9 }}>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          onClick={handleSkip}
          disabled={timerState === 'idle' && completedWorkSessions === 0}
        >
          <SkipForward className="h-5 w-5" />
        </Button>
      </motion.div>
    </div>
  );
}

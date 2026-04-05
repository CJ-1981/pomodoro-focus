'use client';

import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePomodoroStore } from '@/stores/pomodoro';
import { notifyTimerComplete, playAlarmSound, triggerVibration } from '@/lib/fcm';

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
    // Manually complete the current timer
    if (settings.soundEnabled) playAlarmSound();
    if (settings.vibrationEnabled) triggerVibration();
    if (settings.notificationsEnabled) {
      notifyTimerComplete(mode);
    }
    timerComplete();
  };

  return (
    <div className="flex items-center justify-center gap-3">
      {/* Reset button */}
      <motion.div whileTap={{ scale: 0.9 }}>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
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
          className="h-16 w-16 rounded-full text-white shadow-lg transition-all duration-300 hover:shadow-xl"
          style={{
            background:
              mode === 'work'
                ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
                : mode === 'shortBreak'
                  ? 'linear-gradient(135deg, #1abc9c, #16a085)'
                  : 'linear-gradient(135deg, #3498db, #2980b9)',
            boxShadow:
              mode === 'work'
                ? '0 4px 20px rgba(231, 76, 60, 0.4)'
                : mode === 'shortBreak'
                  ? '0 4px 20px rgba(26, 188, 156, 0.4)'
                  : '0 4px 20px rgba(52, 152, 219, 0.4)',
          }}
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
          className="h-12 w-12 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          onClick={handleSkip}
          disabled={timerState === 'idle' && completedWorkSessions === 0}
        >
          <SkipForward className="h-5 w-5" />
        </Button>
      </motion.div>
    </div>
  );
}

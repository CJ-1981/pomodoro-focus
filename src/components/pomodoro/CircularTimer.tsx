'use client';

import { motion } from 'framer-motion';
import { usePomodoroStore } from '@/stores/pomodoro';

const MODE_LABELS = {
  work: 'FOCUS',
  shortBreak: 'SHORT BREAK',
  longBreak: 'LONG BREAK',
};

export function CircularTimer() {
  const { mode, remainingMs, totalTime, timerState } = usePomodoroStore();

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Responsive timer size: 340px on larger screens, fits within viewport on small ones
  // We use CSS max-w to constrain, but keep size=340 for SVG viewBox calculations
  const size = 280;
  const strokeWidth = 12; // Thicker lines as requested
  const bgStrokeWidth = 8; // Slightly thinner background line
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // As time lapses (remainingMs decreases), the circle should get shorter.
  // Full circle (offset=0) at start, empty circle (offset=circumference) at end.
  const remainingProgress = totalTime > 0 ? remainingMs / totalTime : 0;
  const strokeDashoffset = circumference * (1 - remainingProgress);

  const isCompleted = timerState === 'completed';
  const isRunning = timerState === 'running';

  // Compute actual stroke color based on mode
  const getStrokeClass = () => {
    switch (mode) {
      case 'work': return 'stroke-pomodoro-work';
      case 'shortBreak': return 'stroke-pomodoro-short';
      case 'longBreak': return 'stroke-pomodoro-long';
      default: return 'stroke-pomodoro-work';
    }
  };

  const getTextColorClass = () => {
    switch (mode) {
      case 'work': return 'text-pomodoro-work';
      case 'shortBreak': return 'text-pomodoro-short';
      case 'longBreak': return 'text-pomodoro-long';
      default: return 'text-pomodoro-work';
    }
  };

  const strokeClass = getStrokeClass();
  const textColorClass = getTextColorClass();

  return (
    <div className="relative flex items-center justify-center w-full max-w-[300px] aspect-square">
      {/* Subtle shadow ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: '100%',
          height: '100%',
          boxShadow: isRunning
            ? `0 0 60px -10px var(--pomodoro-${mode})`
            : 'none',
          opacity: isRunning ? 0.2 : 0,
          transition: 'opacity 0.5s ease, box-shadow 0.5s ease',
        }}
      />

      <motion.svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted/40"
          strokeWidth={bgStrokeWidth}
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={strokeClass}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'linear' }}
        />
      </motion.svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-xs font-medium tracking-[0.2em] uppercase mb-2 ${textColorClass}`}
          key={mode}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {MODE_LABELS[mode]}
        </motion.span>

        <motion.span
          className="font-mono text-5xl sm:text-6xl font-medium text-foreground tabular-nums leading-none"
          key={timeString}
          initial={isRunning ? { scale: 1.02 } : false}
          animate={{ scale: 1 }}
          transition={{ duration: 0.1 }}
        >
          {timeString}
        </motion.span>

        {timerState === 'paused' && (
          <motion.span
            className="text-xs text-muted-foreground mt-3 font-medium tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            PAUSED
          </motion.span>
        )}

        {isCompleted && (
          <motion.span
            className={`text-xs mt-3 font-semibold ${textColorClass}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            COMPLETE
          </motion.span>
        )}
      </div>
    </div>
  );
}

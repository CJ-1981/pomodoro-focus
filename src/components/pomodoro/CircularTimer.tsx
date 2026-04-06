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
  const progress = totalTime > 0 ? 1 - remainingMs / totalTime : 0;

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Responsive timer size: 340px on larger screens, fits within viewport on small ones
  // We use CSS max-w to constrain, but keep size=340 for SVG viewBox calculations
  const size = 280;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const isCompleted = timerState === 'completed';
  const isRunning = timerState === 'running';

  // Compute actual stroke color based on mode
  const getStrokeColor = () => {
    switch (mode) {
      case 'work': return 'var(--pomodoro-work)';
      case 'shortBreak': return 'var(--pomodoro-short)';
      case 'longBreak': return 'var(--pomodoro-long)';
      default: return 'var(--pomodoro-work)';
    }
  };

  const strokeColor = getStrokeColor();

  return (
    <div className="relative flex items-center justify-center w-full max-w-[300px] aspect-square">
      {/* Subtle shadow ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: '100%',
          height: '100%',
          boxShadow: isRunning
            ? `0 0 60px -10px ${strokeColor}`
            : 'none',
          opacity: isRunning ? 0.15 : 0,
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
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          style={{ stroke: strokeColor }}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </motion.svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-xs font-medium tracking-[0.2em] uppercase mb-2"
          style={{ color: strokeColor }}
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
            className="text-xs mt-3 font-semibold"
            style={{ color: strokeColor }}
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

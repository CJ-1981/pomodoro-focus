'use client';

import { motion } from 'framer-motion';
import { usePomodoroStore } from '@/stores/pomodoro';

const MODE_COLORS = {
  work: {
    stroke: '#e74c3c',
    glow: 'rgba(231, 76, 60, 0.3)',
    bg: 'rgba(231, 76, 60, 0.1)',
  },
  shortBreak: {
    stroke: '#1abc9c',
    glow: 'rgba(26, 188, 156, 0.3)',
    bg: 'rgba(26, 188, 156, 0.1)',
  },
  longBreak: {
    stroke: '#3498db',
    glow: 'rgba(52, 152, 219, 0.3)',
    bg: 'rgba(52, 152, 219, 0.1)',
  },
};

const MODE_LABELS = {
  work: 'FOCUS',
  shortBreak: 'SHORT BREAK',
  longBreak: 'LONG BREAK',
};

export function CircularTimer() {
  const { mode, remainingMs, totalTime, timerState } = usePomodoroStore();
  const progress = totalTime > 0 ? 1 - remainingMs / totalTime : 0;
  const colors = MODE_COLORS[mode];

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const size = 280;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const isCompleted = timerState === 'completed';
  const isRunning = timerState === 'running';

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow effect */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size + 20,
          height: size + 20,
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
        }}
        animate={
          timerState === 'running'
            ? { scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }
            : { scale: 1, opacity: isCompleted ? 0.9 : 0.4 }
        }
        transition={
          timerState === 'running'
            ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
      />

      <motion.svg
        width={size}
        height={size}
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
          stroke={colors.bg}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            filter: `drop-shadow(0 0 6px ${colors.stroke})`,
          }}
        />
      </motion.svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-xs font-semibold tracking-[0.2em] uppercase mb-1"
          style={{ color: colors.stroke }}
          key={mode}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {MODE_LABELS[mode]}
        </motion.span>

        <motion.span
          className="font-mono text-6xl font-bold text-white tabular-nums leading-none"
          key={timeString}
          initial={isRunning ? { scale: 1.05 } : false}
          animate={{ scale: 1 }}
          transition={{ duration: 0.1 }}
        >
          {timeString}
        </motion.span>

        {timerState === 'paused' && (
          <motion.span
            className="text-xs text-yellow-400 mt-2 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            PAUSED
          </motion.span>
        )}

        {isCompleted && (
          <motion.span
            className="text-xs mt-2 font-bold"
            style={{ color: colors.stroke }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            ✨ COMPLETE!
          </motion.span>
        )}
      </div>
    </div>
  );
}

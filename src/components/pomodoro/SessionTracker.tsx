'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePomodoroStore } from '@/stores/pomodoro';

export function SessionTracker() {
  const {
    completedWorkSessions,
    settings,
    resetDayStats,
  } = usePomodoroStore();

  const longBreakInterval = settings.longBreakInterval;
  const currentCyclePosition = completedWorkSessions % longBreakInterval;
  const tomatoesUntilLongBreak = longBreakInterval - currentCyclePosition;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: longBreakInterval }).map((_, i) => (
          <motion.span
            key={i}
            className="text-xl"
            initial={{ scale: 0 }}
            animate={{ scale: i < currentCyclePosition ? 1 : 0.6 }}
            transition={{
              delay: i * 0.05,
              type: 'spring',
              stiffness: 300,
            }}
            style={{
              opacity: i < currentCyclePosition ? 1 : 0.25,
              filter: i < currentCyclePosition ? 'none' : 'grayscale(100%)',
            }}
          >
            🍅
          </motion.span>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-white/40">
          {tomatoesUntilLongBreak === longBreakInterval
            ? `${longBreakInterval} sessions until long break`
            : `${tomatoesUntilLongBreak} more until long break`}
        </span>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-white/30 hover:text-white/60 hover:bg-white/5 text-xs"
          onClick={resetDayStats}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      {completedWorkSessions > 0 && (
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-xs text-white/50">
            Today: <span className="font-semibold text-white/70">{completedWorkSessions}</span> sessions completed
          </span>
        </motion.div>
      )}
    </div>
  );
}

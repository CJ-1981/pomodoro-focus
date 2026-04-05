'use client';

import { motion } from 'framer-motion';
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
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        {Array.from({ length: longBreakInterval }).map((_, i) => {
          const isCompleted = i < currentCyclePosition;
          return (
            <motion.div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                isCompleted
                  ? 'bg-pomodoro-work'
                  : 'border-2 border-pomodoro-work/30 bg-transparent'
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: i * 0.05,
                type: 'spring',
                stiffness: 300,
              }}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground">
          {currentCyclePosition}/{longBreakInterval}
        </span>

        <span className="text-xs text-muted-foreground/60">
          {tomatoesUntilLongBreak === longBreakInterval
            ? `${longBreakInterval} until long break`
            : `${tomatoesUntilLongBreak} more`}
        </span>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent text-xs"
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
          <span className="text-xs text-muted-foreground">
            Today:{' '}
            <span className="font-semibold text-foreground">
              {completedWorkSessions}
            </span>{' '}
            sessions
          </span>
        </motion.div>
      )}
    </div>
  );
}

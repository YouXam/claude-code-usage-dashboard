import { useState, useEffect } from 'react';

interface UsageProgressBarProps {
  label: string;
  percentage: number;
  resetAt: string;
}

export function UsageProgressBar({ label, percentage, resetAt }: UsageProgressBarProps) {
  const [remainingTime, setRemainingTime] = useState('');
  const [resetElapsed, setResetElapsed] = useState(false);

  useEffect(() => {
    const updateRemainingTime = () => {
      const resetTimestamp = Date.parse(resetAt);

      if (isNaN(resetTimestamp)) {
        setRemainingTime('--');
        setResetElapsed(false);
        return;
      }

      const now = Date.now();
      const diffMs = resetTimestamp - now;

      if (diffMs <= 0) {
        setResetElapsed(true);
        setRemainingTime('');
        return;
      }

      setResetElapsed(false);

      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (days > 0) {
        if (hours > 0) {
          setRemainingTime(`${days}d ${hours}h`);
        } else {
          setRemainingTime(`${days}d`);
        }
      } else if (hours > 0) {
        setRemainingTime(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setRemainingTime(`${minutes}m ${seconds}s`);
      } else {
        setRemainingTime(`${seconds}s`);
      }
    };

    // Initial update
    updateRemainingTime();

    // Update every second
    const interval = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [resetAt]);

  // If reset time has passed, show 0%
  const displayPercentage = resetElapsed ? 0 : percentage;

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">
        {label}{!resetElapsed && remainingTime && ` · Resets in ${remainingTime}`}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-chart-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-chart-1"
            style={{ width: `${displayPercentage}%` }}
          ></div>
        </div>
        <span className="text-xs text-muted-foreground min-w-[30px]">{displayPercentage}%</span>
      </div>
    </div>
  );
}

interface UsageProgressBarProps {
  label: string;
  resetTime: string;
  percentage: number;
  resetAfterSeconds?: number;
  resetAt?: string;
}

export function UsageProgressBar({ label, resetTime, percentage, resetAfterSeconds, resetAt }: UsageProgressBarProps) {
  // Check if reset time has passed
  const resetElapsed =
    resetAfterSeconds !== undefined && (
      resetAfterSeconds <= 0 ||
      (resetAt && !isNaN(Date.parse(resetAt)) && Date.now() >= Date.parse(resetAt))
    );

  // If reset time has passed, show 0%
  const displayPercentage = resetElapsed ? 0 : percentage;

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">
        {label}{!resetElapsed && ` · Resets in ${resetTime}`}
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

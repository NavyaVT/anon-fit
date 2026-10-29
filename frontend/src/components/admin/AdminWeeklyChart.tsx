import type { AdminWeeklyPoint } from "@/types";

function barHeight(value: number | null): string {
  if (value == null) return "5%";
  return `${Math.max(5, Math.min(100, (value / 12) * 100))}%`;
}

export default function AdminWeeklyChart({ points }: { points: AdminWeeklyPoint[] }) {
  const trackedCheckins = points.reduce((sum, point) => sum + point.trackedUsers, 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="section-title">7-day health trends</h3>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {trackedCheckins} check-in{trackedCheckins === 1 ? "" : "s"} across all members
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" /> Sleep
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-400" /> Screen
          </span>
        </div>
      </div>

      <div className="relative mt-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-7 flex flex-col justify-between">
          {[12, 8, 4, 0].map((hour) => (
            <div
              key={hour}
              className="flex items-center gap-2 border-t border-dashed border-slate-200/70 first:border-0 dark:border-white/[0.05]"
            >
              <span className="-mt-1 w-4 text-right text-[8px] text-slate-300 dark:text-slate-600">
                {hour}
              </span>
            </div>
          ))}
        </div>

        <div className="relative flex h-48 items-end gap-1.5 pl-6 sm:gap-4">
          {points.map((point) => (
            <div key={point.date} className="flex h-full flex-1 flex-col items-center justify-end">
              <div className="flex h-full w-full items-end justify-center gap-[3px] sm:gap-1.5">
                <div
                  className="w-[38%] max-w-5 rounded-t-md bg-gradient-to-t from-cyan-500/50 to-cyan-300 transition-all duration-500"
                  style={{ height: barHeight(point.avgSleepHours) }}
                  title={
                    point.avgSleepHours != null
                      ? `Avg sleep: ${point.avgSleepHours}h`
                      : "No sleep data"
                  }
                />
                <div
                  className="w-[38%] max-w-5 rounded-t-md bg-gradient-to-t from-violet-500/40 to-violet-300 transition-all duration-500"
                  style={{ height: barHeight(point.avgScreenTimeHours) }}
                  title={
                    point.avgScreenTimeHours != null
                      ? `Avg screen: ${point.avgScreenTimeHours}h`
                      : "No screen data"
                  }
                />
              </div>
              <span className="mt-2 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                {point.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1.5 border-t border-slate-200/70 pt-4 dark:border-white/[0.06] sm:gap-3">
        {points.map((point) => {
          const pct = Math.round(point.workoutCompletionRate * 100);
          return (
            <div key={point.date}>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[8px] text-slate-400 dark:text-slate-500">
                  {point.label}
                </span>
                <span className="text-[8px] font-semibold text-brand-600 dark:text-brand-300">
                  {pct}%
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-400 to-cyan-400 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Workout completion rate per day
      </p>
    </div>
  );
}

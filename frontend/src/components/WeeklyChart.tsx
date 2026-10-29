import { Check } from "lucide-react";
import type { WeeklyPoint } from "@/types";
import { cn } from "@/lib/utils";

interface WeeklyChartProps {
  points: WeeklyPoint[];
  subtitle?: string;
}

function barHeight(value: number | null): string {
  if (value == null) return "6%";
  const percent = Math.max(6, Math.min(100, (value / 12) * 100));
  return `${percent}%`;
}

export default function WeeklyChart({ points, subtitle }: WeeklyChartProps) {
  const hasAnyData = points.some(
    (point) => point.sleepHours != null || point.screenTimeHours != null,
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="section-title">Sleep vs screen</h3>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {subtitle ?? "Last 7 days · hours per day"}
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

        <div className="relative flex h-44 items-end gap-1.5 pl-6 sm:gap-3">
          {points.map((point) => (
            <div key={point.date} className="flex h-full flex-1 flex-col items-center justify-end">
              <div className="flex h-full w-full items-end justify-center gap-[3px] sm:gap-1">
                <div
                  className={cn(
                    "w-[42%] max-w-5 rounded-t-md bg-gradient-to-t from-cyan-500/50 to-cyan-300 transition-all duration-500",
                    point.sleepHours == null && "bg-slate-200 dark:bg-white/[0.06]",
                  )}
                  style={{ height: barHeight(point.sleepHours) }}
                  title={point.sleepHours != null ? `Sleep: ${point.sleepHours}h` : "No sleep data"}
                />
                <div
                  className={cn(
                    "w-[42%] max-w-5 rounded-t-md bg-gradient-to-t from-violet-500/40 to-violet-300 transition-all duration-500",
                    point.screenTimeHours == null && "bg-slate-200 dark:bg-white/[0.06]",
                  )}
                  style={{ height: barHeight(point.screenTimeHours) }}
                  title={
                    point.screenTimeHours != null
                      ? `Screen: ${point.screenTimeHours}h`
                      : "No screen data"
                  }
                />
              </div>
              <div className="mt-2 flex h-5 flex-col items-center justify-center">
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  {point.label}
                </span>
              </div>
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full",
                  point.workoutCompleted
                    ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                    : "bg-transparent text-transparent",
                )}
                title={point.workoutCompleted ? "Workout completed" : "No workout"}
              >
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
            </div>
          ))}
        </div>
      </div>

      {!hasAnyData && (
        <p className="mt-3 rounded-xl bg-slate-100/70 px-3 py-2 text-center text-[11px] text-slate-400 dark:bg-white/[0.03] dark:text-slate-500">
          Log your sleep and screen time to bring this chart to life.
        </p>
      )}
      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-300">
          <Check className="h-2 w-2" strokeWidth={3} />
        </span>
        Workout completed
      </div>
    </div>
  );
}

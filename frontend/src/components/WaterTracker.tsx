import { GlassWater, Minus, Plus } from "lucide-react";
import { cn, percent } from "@/lib/utils";

interface WaterTrackerProps {
  glasses: number;
  goal: number;
  onChange: (glasses: number) => void;
  saving?: boolean;
  compact?: boolean;
}

export default function WaterTracker({
  glasses,
  goal,
  onChange,
  saving = false,
  compact = false,
}: WaterTrackerProps) {
  const progress = percent(glasses, goal);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Hydration
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {glasses}
            <span className="ml-1 text-sm font-normal text-slate-400">/ {goal} glasses</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange(Math.max(0, glasses - 1))}
            disabled={saving || glasses <= 0}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-brand-400/40 hover:text-brand-600 disabled:opacity-40 dark:border-white/10 dark:text-slate-400"
            aria-label="Remove one glass"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onChange(Math.min(30, glasses + 1))}
            disabled={saving || glasses >= 30}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 transition hover:bg-cyan-500/20 disabled:opacity-40 dark:text-cyan-300"
            aria-label="Add one glass"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "mt-4 grid gap-2",
          compact ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-8",
        )}
        role="group"
        aria-label="Water intake"
      >
        {Array.from({ length: goal }).map((_, index) => {
          const filled = index < glasses;
          return (
            <button
              key={index}
              type="button"
              disabled={saving}
              onClick={() => onChange(index < glasses ? index : index + 1)}
              className={cn(
                "group relative flex h-11 items-center justify-center rounded-xl border transition duration-200 disabled:cursor-wait",
                filled
                  ? "border-cyan-400/40 bg-gradient-to-b from-cyan-400/25 to-cyan-500/10 text-cyan-500 dark:text-cyan-300"
                  : "border-slate-200 bg-slate-50/50 text-slate-300 hover:border-cyan-400/30 hover:text-cyan-400 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-600",
              )}
              aria-label={`${index + 1} glass${index === 0 ? "" : "es"}`}
              aria-pressed={filled}
            >
              <GlassWater className={cn("h-5 w-5 transition", filled && "drop-shadow-sm")} />
            </button>
          );
        })}
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-brand-400 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
        {glasses >= goal
          ? "Goal reached — nicely hydrated."
          : `${goal - glasses} more glass${goal - glasses === 1 ? "" : "es"} to hit your goal.`}
      </p>
    </div>
  );
}

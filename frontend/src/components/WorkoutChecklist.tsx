import { Check, ExternalLink, Loader2, Play } from "lucide-react";
import type { WorkoutToday } from "@/types";
import { cn, percent, youtubeAt } from "@/lib/utils";

interface WorkoutChecklistProps {
  workout: WorkoutToday;
  onToggle: (index: number) => void;
  togglingIndex?: number | null;
  maxHeight?: string;
}

export default function WorkoutChecklist({
  workout,
  onToggle,
  togglingIndex = null,
  maxHeight = "none",
}: WorkoutChecklistProps) {
  const progress = percent(workout.completedCount, workout.total);

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Today&apos;s workout
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            {workout.title}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:text-brand-300">
          {workout.completedCount}/{workout.total}
        </span>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-cyan-400 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div
        className="mt-3 space-y-2 overflow-y-auto pr-0.5"
        style={{ maxHeight }}
      >
        {workout.exercises.map((exercise) => {
          const playUrl = youtubeAt(workout.videoId, exercise.startSeconds);
          const isToggling = togglingIndex === exercise.index;

          return (
            <div
              key={exercise.index}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3 transition",
                exercise.completed
                  ? "border-brand-400/20 bg-brand-500/[0.05]"
                  : "border-slate-200/80 bg-white/40 hover:border-brand-400/25 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-brand-400/20",
              )}
            >
              <button
                type="button"
                onClick={() => onToggle(exercise.index)}
                disabled={isToggling}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition",
                  exercise.completed
                    ? "border-brand-400 bg-brand-500 text-slate-950"
                    : "border-slate-300 text-transparent hover:border-brand-400 dark:border-white/15",
                )}
                aria-label={
                  exercise.completed
                    ? `Mark ${exercise.name} as not done`
                    : `Mark ${exercise.name} as done`
                }
                aria-pressed={exercise.completed}
              >
                {isToggling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" />
                ) : (
                  <Check className="h-4 w-4" strokeWidth={3} />
                )}
              </button>

              <button
                type="button"
                onClick={() => onToggle(exercise.index)}
                className="min-w-0 flex-1 text-left"
              >
                <p
                  className={cn(
                    "truncate text-sm font-medium transition",
                    exercise.completed
                      ? "text-slate-400 line-through dark:text-slate-500"
                      : "text-slate-800 dark:text-slate-100",
                  )}
                >
                  {exercise.name}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                  Starts at {exercise.timestamp}
                </p>
              </button>

              {playUrl ? (
                <a
                  href={playUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition hover:border-rose-400/30 hover:text-rose-500 dark:border-white/10 dark:text-slate-400"
                  title="Open this exercise on YouTube"
                >
                  <Play className="h-3 w-3" />
                  {exercise.timestamp}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              ) : (
                <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">
                  {exercise.timestamp}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {workout.completed && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-brand-600 dark:text-brand-300">
          <Check className="h-3.5 w-3.5" />
          Workout complete — streak updated.
        </p>
      )}
    </div>
  );
}

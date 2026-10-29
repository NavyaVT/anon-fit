import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import {
  AppWindow,
  ArrowRight,
  ArrowUpRight,
  Dumbbell,
  Flame,
  Moon,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
} from "lucide-react";
import toast from "react-hot-toast";
import { getToday, setWater, toggleExercise } from "@/api/health";
import { getErrorMessage } from "@/api/client";
import AnonIdChip from "@/components/AnonIdChip";
import WaterTracker from "@/components/WaterTracker";
import WeeklyChart from "@/components/WeeklyChart";
import WorkoutChecklist from "@/components/WorkoutChecklist";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ProgressRing from "@/components/ui/ProgressRing";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/stores/authStore";
import type { TodayData } from "@/types";
import { cn, formatHours, greeting, memberLabel } from "@/lib/utils";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [today, setToday] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waterSaving, setWaterSaving] = useState(false);
  const [togglingIndex, setTogglingIndex] = useState<number | null>(null);

  const loadToday = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const data = await getToday();
      setToday(data);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load your dashboard"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  async function handleWater(glasses: number) {
    if (!today || waterSaving) return;
    const previous = today.waterGlasses;
    setWaterSaving(true);
    try {
      const day = await setWater({ glasses });
      setToday((current) =>
        current
          ? {
              ...current,
              waterGlasses: day.waterGlasses,
              weekly: current.weekly.map((point) =>
                point.date === day.date
                  ? { ...point, waterGlasses: day.waterGlasses }
                  : point,
              ),
            }
          : current,
      );
      if (day.waterGlasses >= today.waterGoal && previous < today.waterGoal) {
        toast.success("Hydration goal reached 💧");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update water intake"));
    } finally {
      setWaterSaving(false);
    }
  }

  async function handleToggle(index: number) {
    if (!today?.workout || togglingIndex !== null) return;
    setTogglingIndex(index);
    try {
      const result = await toggleExercise(today.workout.planId, index);
      setToday((current) => {
        if (!current || !current.workout) return current;
        return {
          ...current,
          streak: result.streak,
          weekly: current.weekly.map((point) =>
            point.date === result.date
              ? { ...point, workoutCompleted: result.workoutCompleted }
              : point,
          ),
          workout: {
            ...current.workout,
            completedCount: result.completedCount,
            completed: result.workoutCompleted,
            exercises: current.workout.exercises.map((exercise) => ({
              ...exercise,
              completed: result.completedExercises.includes(exercise.index),
            })),
          },
        };
      });
      if (result.workoutCompleted) {
        toast.success(`Workout complete — ${result.streak}-day streak! 🔥`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update the exercise"));
    } finally {
      setTogglingIndex(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-8 w-64" />
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  if (error || !today) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-500">
          <RefreshCw className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-xl font-semibold text-slate-900 dark:text-white">
          Could not load your day
        </h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{error}</p>
        <Button className="mt-5" onClick={() => void loadToday()} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Try again
        </Button>
      </div>
    );
  }

  const workoutPercent = today.workout?.total
    ? Math.round((today.workout.completedCount / today.workout.total) * 100)
    : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 animate-fade-up sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">
            {dayjs().format("dddd, MMMM D")}
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {greeting()}.
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <AnonIdChip anonymizedId={user?.anonymizedId ?? ""} />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/60 px-2.5 py-1 text-[10px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
              <ShieldCheck className="h-3 w-3 text-brand-500" />
              Identity kept separate
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/tracking" className="flex-1 sm:flex-none">
            <Button variant="secondary" className="w-full" leftIcon={<Target className="h-4 w-4" />}>
              Log today
            </Button>
          </Link>
          <Link to="/workouts" className="flex-1 sm:flex-none">
            <Button className="w-full" leftIcon={<Plus className="h-4 w-4" />}>
              Workout
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero / daily rings */}
      <section className="card relative overflow-hidden p-5 animate-fade-up [animation-delay:60ms] sm:p-7">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(500px 300px at 95% 0%, rgba(16,185,129,0.11), transparent 65%), radial-gradient(400px 300px at 0% 100%, rgba(14,165,233,0.07), transparent 65%)",
          }}
        />
        <div className="relative grid items-center gap-7 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/20 bg-brand-500/[0.07] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
              <Sparkles className="h-3 w-3" />
              Today&apos;s progress
            </span>
            <h2 className="mt-3 max-w-md font-display text-xl font-semibold leading-snug tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              {today.workout?.completed
                ? "You closed the loop today. Recovery is progress too."
                : "Small check-ins. Real momentum."}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {today.workout
                ? `${today.workout.completedCount} of ${today.workout.total} exercises done · ${today.waterGlasses} glasses of water · ${formatHours(today.sleepHours)} sleep.`
                : "Create your first YouTube workout plan to start a streak. Your data will only ever be tied to your anonymous ID."}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="chip">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                {today.streak}-day streak
              </span>
              <span className="chip">
                <Dumbbell className="h-3.5 w-3.5 text-brand-500" />
                {workoutPercent}% workout
              </span>
              <span className="chip">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-500" />
                No personal details attached
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="flex justify-center">
              <ProgressRing
                value={today.workout?.completedCount ?? 0}
                max={today.workout?.total ?? 0}
                label="workout"
                display={
                  today.workout ? `${today.workout.completedCount}/${today.workout.total}` : "—"
                }
                size={96}
                stroke={7}
                from="#34d399"
                to="#10b981"
              />
            </div>
            <div className="flex justify-center">
              <ProgressRing
                value={today.waterGlasses}
                max={today.waterGoal}
                label="water"
                display={`${today.waterGlasses}/${today.waterGoal}`}
                size={96}
                stroke={7}
                from="#22d3ee"
                to="#0ea5e9"
              />
            </div>
            <div className="flex justify-center">
              <ProgressRing
                value={today.sleepHours ?? 0}
                max={today.sleepGoal}
                label="sleep"
                display={today.sleepHours != null ? `${today.sleepHours}h` : "—"}
                size={96}
                stroke={7}
                from="#a78bfa"
                to="#818cf8"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card card-pad animate-fade-up [animation-delay:120ms] lg:col-span-2">
          {today.workout ? (
            <>
              <WorkoutChecklist
                workout={today.workout}
                onToggle={handleToggle}
                togglingIndex={togglingIndex}
                maxHeight="330px"
              />
              <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-4 dark:border-white/[0.06]">
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {today.workout.youtubeUrl ? "Video workout · tap a timecode to play" : "Manual workout"}
                </p>
                <Link
                  to={`/workouts/${today.workout.planId}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-500 dark:text-brand-300"
                >
                  Open plan <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          ) : (
            <EmptyState
              icon={Dumbbell}
              title="No workout plan yet"
              description="Paste a YouTube URL, add your exercises with timestamps, and start checking them off."
              action={
                <Link to="/workouts">
                  <Button leftIcon={<Plus className="h-4 w-4" />}>Create a workout plan</Button>
                </Link>
              }
              className="border-0 py-6"
            />
          )}
        </section>

        <div className="space-y-5">
          <section className="card card-pad animate-fade-up [animation-delay:180ms]">
            <WaterTracker
              glasses={today.waterGlasses}
              goal={today.waterGoal}
              onChange={handleWater}
              saving={waterSaving}
            />
          </section>

          <section className="card card-pad relative overflow-hidden animate-fade-up [animation-delay:220ms]">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Streak
                </p>
                <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  {today.streak}
                  <span className="ml-1 text-sm font-normal text-slate-400">
                    day{today.streak === 1 ? "" : "s"}
                  </span>
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400/20 to-rose-500/10 text-orange-500">
                <Flame className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {today.streak > 0
                ? "Complete today's workout to keep the chain alive."
                : "Finish a workout today to spark your first streak."}
            </p>
            <div className="mt-4 flex items-center justify-between gap-1.5">
              {today.weekly.map((point) => (
                <div key={point.date} className="flex flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold transition",
                      point.workoutCompleted
                        ? "bg-gradient-to-br from-orange-400/30 to-brand-500/20 text-orange-600 dark:text-orange-300"
                        : "bg-slate-100 text-slate-400 dark:bg-white/[0.05] dark:text-slate-600",
                    )}
                  >
                    {point.workoutCompleted ? <Flame className="h-3.5 w-3.5" /> : "·"}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500">
                    {point.label.slice(0, 1)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Lower grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card card-pad animate-fade-up [animation-delay:260ms] lg:col-span-2">
          <WeeklyChart points={today.weekly} />
        </section>

        <section className="card card-pad animate-fade-up [animation-delay:300ms]">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="section-title">Body signals</h3>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Your self-reported check-in
              </p>
            </div>
            <Link
              to="/tracking"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-brand-400/40 hover:text-brand-600 dark:border-white/10 dark:text-slate-400"
              aria-label="Update daily check-in"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 p-3 dark:border-white/[0.06]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                <Smartphone className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Screen time</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {today.screenTimeHours != null ? formatHours(today.screenTimeHours) : "Not logged"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 p-3 dark:border-white/[0.06]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                <Moon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Sleep</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {today.sleepHours != null ? formatHours(today.sleepHours) : "Not logged"}
                </p>
              </div>
              {today.sleepHours != null && (
                <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-500 dark:text-indigo-300">
                  {Math.round((today.sleepHours / today.sleepGoal) * 100)}%
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 p-3 dark:border-white/[0.06]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                <AppWindow className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Most used app</p>
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {today.mostUsedApp ?? "Not logged"}
                </p>
              </div>
            </div>
          </div>

          <Link to="/tracking">
            <Button variant="secondary" size="sm" className="mt-4 w-full">
              Update check-in
            </Button>
          </Link>
        </section>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-brand-500/15 bg-brand-500/[0.04] px-4 py-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-500 dark:text-brand-300" />
        <p>
          Everything on this page is loaded through your private member code{" "}
          <span className="font-mono text-brand-700 dark:text-brand-300">
            {memberLabel(user?.anonymizedId)}
          </span>
          . Your email is never sent along with your health numbers.
        </p>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import {
  AppWindow,
  Bell,
  BellOff,
  Check,
  Droplets,
  Moon,
  RefreshCw,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { getHistory, getToday, setWater } from "@/api/health";
import { getErrorMessage } from "@/api/client";
import AnonIdChip from "@/components/AnonIdChip";
import MetricForm from "@/components/MetricForm";
import WaterTracker from "@/components/WaterTracker";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import Switch from "@/components/ui/Switch";
import type { HealthDay, HistoryResponse, TodayData } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import {
  formatDate,
  formatDayLabel,
  formatHours,
  formatRelative,
} from "@/lib/utils";

const REMINDER_KEY = "anonfit-water-reminder";

export default function TrackingPage() {
  const user = useAuthStore((state) => state.user);
  const [today, setToday] = useState<TodayData | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waterSaving, setWaterSaving] = useState(false);
  const [reminder, setReminder] = useState(
    () => localStorage.getItem(REMINDER_KEY) === "on",
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [todayData, historyData] = await Promise.all([getToday(), getHistory(14)]);
      setToday(todayData);
      setHistory(historyData);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load your tracking data"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    localStorage.setItem(REMINDER_KEY, reminder ? "on" : "off");
    if (!reminder) return;

    const timer = window.setInterval(() => {
      toast("Time for a glass of water 💧", {
        icon: "💧",
        duration: 5000,
      });
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("AnonFit hydration check", {
          body: "A quick glass of water keeps the streak of good habits going.",
        });
      }
    }, 60 * 60 * 1000);

    return () => window.clearInterval(timer);
  }, [reminder]);

  async function toggleReminder(next: boolean) {
    if (next && "Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // Reminders still work as in-app toasts.
      }
    }
    setReminder(next);
    toast.success(next ? "Water reminders enabled" : "Water reminders paused");
  }

  function testReminder() {
    toast("Time for a glass of water 💧", { icon: "💧" });
  }

  async function handleWater(glasses: number) {
    if (!today || waterSaving) return;
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
      applyDayToHistory(day);
      if (glasses >= today.waterGoal && today.waterGlasses < today.waterGoal) {
        toast.success("Hydration goal reached 💧");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update water intake"));
    } finally {
      setWaterSaving(false);
    }
  }

  function applyDayToHistory(day: HealthDay) {
    setHistory((current) =>
      current
        ? {
            ...current,
            days: current.days.map((entry) =>
              entry.date === day.date ? { ...entry, ...day } : entry,
            ),
          }
        : current,
    );
  }

  function handleMetricsSaved(day: HealthDay) {
    setToday((current) =>
      current
        ? {
            ...current,
            screenTimeHours: day.screenTimeHours,
            mostUsedApp: day.mostUsedApp,
            sleepHours: day.sleepHours,
          }
        : current,
    );
    applyDayToHistory(day);
  }

  const recent = history?.days.slice(-7) ?? [];
  const sleepValues = recent.map((day) => day.sleepHours).filter((v): v is number => v != null);
  const screenValues = recent
    .map((day) => day.screenTimeHours)
    .filter((v): v is number => v != null);
  const avgSleep = sleepValues.length
    ? sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length
    : null;
  const avgScreen = screenValues.length
    ? screenValues.reduce((sum, value) => sum + value, 0) / screenValues.length
    : null;
  const workoutsThisWeek = recent.filter((day) => day.workoutCompleted).length;

  if (loading) {
    return (
      <div>
        <PageHeader
          eyebrow="Daily check-in"
          title="Tracking"
          description="Water, screen time, sleep and the app that took most of your attention."
        />
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-3xl lg:col-span-2" />
          <div className="space-y-5">
            <Skeleton className="h-56 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
          </div>
        </div>
        <Skeleton className="mt-5 h-96 rounded-3xl" />
      </div>
    );
  }

  if (error || !today || !history) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {error ?? "Tracking data unavailable"}
        </p>
        <Button className="mt-5" onClick={() => void load()} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={formatDate(today.date, "dddd, MMMM D")}
        title="Daily check-in"
        description="A 30-second log for the habits behind your energy. Every value is stored under your private member code."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void load()}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <AnonIdChip anonymizedId={user?.anonymizedId ?? ""} />
        <span className="chip">
          <Sparkles className="h-3.5 w-3.5 text-brand-500" />
          {history.streak}-day workout streak
        </span>
        <span className="chip">
          <Check className="h-3.5 w-3.5 text-cyan-500" />
          {history.days.filter((day) => day.updatedAt).length} logged days
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card card-pad animate-fade-up lg:col-span-2">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="section-title">Phone & sleep</h2>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Self-reported · saved for {formatDayLabel(today.date)}
              </p>
            </div>
            <span className="icon-tile h-10 w-10">
              <Smartphone className="h-4.5 w-4.5" />
            </span>
          </div>
          <MetricForm today={today} onSaved={handleMetricsSaved} />
        </section>

        <div className="space-y-5">
          <section className="card card-pad animate-fade-up [animation-delay:80ms]">
            <WaterTracker
              glasses={today.waterGlasses}
              goal={today.waterGoal}
              onChange={handleWater}
              saving={waterSaving}
            />
          </section>

          <section className="card card-pad animate-fade-up [animation-delay:120ms]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500">
                  {reminder ? <Bell className="h-4.5 w-4.5" /> : <BellOff className="h-4.5 w-4.5" />}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Water reminders
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    An in-app nudge every hour while this tab is open.
                  </p>
                </div>
              </div>
              <Switch
                checked={reminder}
                onChange={(next) => void toggleReminder(next)}
                label="Water reminders"
              />
            </div>
            {reminder && (
              <button
                type="button"
                onClick={testReminder}
                className="mt-3 w-full rounded-xl border border-dashed border-cyan-500/25 py-2 text-[11px] font-medium text-cyan-600 transition hover:bg-cyan-500/[0.05] dark:text-cyan-300"
              >
                Send a test reminder
              </button>
            )}
          </section>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          {
            icon: Moon,
            label: "Avg sleep",
            value: avgSleep != null ? formatHours(Number(avgSleep.toFixed(1))) : "—",
            tone: "bg-indigo-500/10 text-indigo-500",
          },
          {
            icon: Smartphone,
            label: "Avg screen",
            value: avgScreen != null ? formatHours(Number(avgScreen.toFixed(1))) : "—",
            tone: "bg-violet-500/10 text-violet-500",
          },
          {
            icon: Check,
            label: "Workouts / 7",
            value: `${workoutsThisWeek}/7`,
            tone: "bg-brand-500/10 text-brand-500",
          },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-3 p-3.5 sm:p-4">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.tone}`}>
              <stat.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[9px] uppercase tracking-wider text-slate-400 sm:text-[10px]">
                {stat.label}
              </p>
              <p className="font-display text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <section className="card card-pad mt-5 animate-fade-up [animation-delay:160ms]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="section-title">Recent days</h2>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Last {history.days.length} days · newest first
            </p>
          </div>
          <span className="chip">
            <Droplets className="h-3.5 w-3.5 text-cyan-500" />
            Today: {today.waterGlasses}/{today.waterGoal} glasses
          </span>
        </div>

        <div className="mt-5 space-y-2">
          {[...history.days].reverse().map((day) => (
            <div
              key={day.date}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 p-3.5 transition hover:border-brand-400/25 dark:border-white/[0.06] dark:hover:border-brand-400/20 sm:flex-row sm:items-center sm:gap-5"
            >
              <div className="flex items-center justify-between gap-3 sm:w-40 sm:shrink-0 sm:justify-start">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatDayLabel(day.date)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                    {formatDate(day.date)} · {formatRelative(day.updatedAt)}
                  </p>
                </div>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full sm:hidden ${
                    day.workoutCompleted
                      ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                      : "bg-slate-100 text-slate-300 dark:bg-white/[0.05] dark:text-slate-600"
                  }`}
                  title={day.workoutCompleted ? "Workout completed" : "No workout"}
                >
                  {day.workoutCompleted ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </span>
              </div>

              <div className="grid flex-1 grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <Droplets className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-slate-400">Water</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {day.waterGlasses} glasses
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-slate-400">Screen</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {day.screenTimeHours != null ? formatHours(day.screenTimeHours) : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Moon className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-slate-400">Sleep</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {day.sleepHours != null ? formatHours(day.sleepHours) : "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5 dark:border-white/[0.04] sm:w-40 sm:shrink-0 sm:border-0 sm:pt-0">
                <div className="flex min-w-0 items-center gap-2">
                  <AppWindow className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400">
                      Most used
                    </p>
                    <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                      {day.mostUsedApp ?? "—"}
                    </p>
                  </div>
                </div>
                <span
                  className={`hidden h-7 w-7 items-center justify-center rounded-full sm:flex ${
                    day.workoutCompleted
                      ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                      : "bg-slate-100 text-slate-300 dark:bg-white/[0.05] dark:text-slate-600"
                  }`}
                  title={day.workoutCompleted ? "Workout completed" : "No workout"}
                >
                  {day.workoutCompleted ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-slate-200/80 bg-white/40 px-4 py-3 text-[11px] leading-relaxed text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-400">
        <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />
        Reminders are local to this browser tab. AnonFit does not send push
        notifications, collect device identifiers or access your app usage data — the
        screen-time and most-used-app values are entered by you.
      </div>
    </div>
  );
}

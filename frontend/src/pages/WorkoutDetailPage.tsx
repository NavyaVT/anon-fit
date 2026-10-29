import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  ExternalLink,
  Film,
  Flame,
  Play,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Youtube,
} from "lucide-react";
import toast from "react-hot-toast";
import { deletePlan, getPlan, getToday, toggleExercise } from "@/api/health";
import { getErrorMessage } from "@/api/client";
import WorkoutChecklist from "@/components/WorkoutChecklist";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ProgressRing from "@/components/ui/ProgressRing";
import { PageLoader } from "@/components/ui/Spinner";
import type { WorkoutPlan, WorkoutToday } from "@/types";
import {
  formatDate,
  formatRelative,
  formatTimecode,
  youtubeThumbnail,
} from "@/lib/utils";

export default function WorkoutDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [completedIndexes, setCompletedIndexes] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingIndex, setTogglingIndex] = useState<number | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    if (!planId) return;
    setLoading(true);
    setError(null);
    try {
      const [planData, today] = await Promise.all([getPlan(planId), getToday()]);
      setPlan(planData);
      setStreak(today.streak);
      if (today.workout?.planId === planData.id) {
        setCompletedIndexes(
          today.workout.exercises.filter((exercise) => exercise.completed).map((e) => e.index),
        );
      } else {
        setCompletedIndexes([]);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Could not load this workout plan"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  async function handleToggle(index: number) {
    if (!plan || togglingIndex !== null) return;
    setTogglingIndex(index);
    try {
      const result = await toggleExercise(plan.id, index);
      setCompletedIndexes(result.completedExercises);
      setStreak(result.streak);
      if (result.workoutCompleted) {
        toast.success(`Workout complete — ${result.streak}-day streak! 🔥`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update the exercise"));
    } finally {
      setTogglingIndex(null);
    }
  }

  async function handleDelete() {
    if (!plan) return;
    setDeleting(true);
    try {
      await deletePlan(plan.id);
      toast.success("Workout plan deleted");
      navigate("/workouts", { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete the plan"));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <PageLoader label="Loading your workout..." />;

  if (error || !plan) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {error ?? "Workout plan not found"}
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => void load()} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Retry
          </Button>
          <Link to="/workouts">
            <Button leftIcon={<ArrowLeft className="h-4 w-4" />}>All plans</Button>
          </Link>
        </div>
      </div>
    );
  }

  const total = plan.exercises.length;
  const completedCount = completedIndexes.length;
  const completed = total > 0 && completedCount === total;

  const workout: WorkoutToday = {
    planId: plan.id,
    title: plan.title,
    youtubeUrl: plan.youtubeUrl,
    videoId: plan.videoId,
    exercises: plan.exercises.map((exercise) => ({
      ...exercise,
      completed: completedIndexes.includes(exercise.index),
    })),
    completedCount,
    total,
    completed,
  };

  const thumbnail = youtubeThumbnail(plan.videoId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between animate-fade-up">
        <Link
          to="/workouts"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          All workout plans
        </Link>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-500 transition hover:border-rose-400/30 hover:text-rose-500 dark:border-white/10 dark:text-slate-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      <div className="animate-fade-up">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/20 bg-brand-500/[0.07] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
            <Film className="h-3 w-3" />
            Workout plan
          </span>
          <span className="chip !text-[10px]">
            <CalendarDays className="h-3 w-3" />
            Created {formatDate(plan.createdAt)}
          </span>
        </div>
        <h1 className="mt-3 max-w-2xl font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {plan.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {total} exercise{total === 1 ? "" : "s"}
          {plan.videoId ? " · video workout with timecodes" : " · manual checklist"}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card overflow-hidden animate-fade-up [animation-delay:60ms]">
            {plan.videoId ? (
              <div className="aspect-video w-full bg-slate-950">
                {showVideo ? (
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${plan.videoId}?autoplay=1&rel=0`}
                    title={plan.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowVideo(true)}
                    className="group relative block h-full w-full overflow-hidden"
                    aria-label="Play workout video"
                  >
                    {thumbnail && (
                      <img
                        src={thumbnail}
                        alt=""
                        className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-[1.02] group-hover:opacity-100"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
                    <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition group-hover:scale-110 group-hover:bg-brand-400 group-hover:text-slate-950">
                      <Play className="ml-1 h-6 w-6" />
                    </span>
                    <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/60 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur">
                      <Youtube className="h-3.5 w-3.5 text-rose-400" />
                      Play on YouTube (privacy-enhanced)
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex aspect-[21/9] flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-50 text-center dark:from-white/[0.04] dark:to-white/[0.01]">
                <Film className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  No YouTube video attached to this plan.
                </p>
              </div>
            )}
          </section>

          <section className="card card-pad animate-fade-up [animation-delay:120ms]">
            <WorkoutChecklist
              workout={workout}
              onToggle={handleToggle}
              togglingIndex={togglingIndex}
            />
            <p className="mt-4 border-t border-slate-200/80 pt-3 text-[11px] leading-relaxed text-slate-400 dark:border-white/[0.06] dark:text-slate-500">
              Checking an exercise makes this plan today&apos;s focus and updates your
              streak on the server.
            </p>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card card-pad animate-fade-up [animation-delay:80ms]">
            <div className="flex flex-col items-center text-center">
              <ProgressRing
                value={completedCount}
                max={total}
                label="completed"
                display={`${completedCount}/${total}`}
                size={140}
                stroke={10}
              />
              <p className="mt-4 font-display text-base font-semibold text-slate-900 dark:text-white">
                {completed ? "Workout complete" : "Keep going"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {completed
                  ? "Every exercise checked off today."
                  : `${total - completedCount} exercise${total - completedCount === 1 ? "" : "s"} left today.`}
              </p>
              <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500/[0.07] px-3 py-2.5">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {streak}-day streak
                </span>
              </div>
            </div>
          </section>

          <section className="card card-pad animate-fade-up [animation-delay:140ms]">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Timecodes
            </h3>
            <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto">
              {plan.exercises.map((exercise) => (
                <a
                  key={exercise.index}
                  href={
                    plan.videoId
                      ? `https://www.youtube.com/watch?v=${plan.videoId}&t=${exercise.startSeconds}s`
                      : undefined
                  }
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-xs transition hover:bg-slate-900/[0.035] dark:hover:bg-white/[0.04]"
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
                    {exercise.name}
                  </span>
                  <span className="font-mono text-[10px] text-brand-600 dark:text-brand-300">
                    {formatTimecode(exercise.startSeconds)}
                  </span>
                  {plan.videoId && <ExternalLink className="h-3 w-3 text-slate-300" />}
                </a>
              ))}
            </div>
          </section>

          <div className="flex items-start gap-2.5 rounded-2xl border border-brand-500/15 bg-brand-500/[0.04] px-4 py-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-500 dark:text-brand-300" />
            Progress is saved under your private member code. No video watch history is
            collected — links open directly in a new tab.
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete this workout plan?"
        description="The plan and its timestamped exercises will be removed. Your streak from completed days is kept."
        confirmLabel="Delete plan"
        loading={deleting}
      />
    </div>
  );
}

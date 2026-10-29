import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Clock,
  Dumbbell,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Youtube,
} from "lucide-react";
import toast from "react-hot-toast";
import { deletePlan, getPlans } from "@/api/health";
import { getErrorMessage } from "@/api/client";
import CreatePlanModal from "@/components/CreatePlanModal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { CardsSkeleton } from "@/components/ui/Skeleton";
import type { WorkoutPlan } from "@/types";
import { formatRelative, youtubeThumbnail } from "@/lib/utils";

export default function WorkoutsPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutPlan | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadPlans() {
    setLoading(true);
    setError(null);
    try {
      setPlans(await getPlans());
    } catch (err) {
      setError(getErrorMessage(err, "Could not load your plans"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePlan(deleteTarget.id);
      setPlans((current) => current.filter((plan) => plan.id !== deleteTarget.id));
      toast.success("Workout plan deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete the plan"));
    } finally {
      setDeleting(false);
    }
  }

  const totalExercises = plans.reduce((sum, plan) => sum + plan.exerciseCount, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Workout library"
        title="Your plans"
        description="Paste a YouTube workout, add timecoded exercises and turn it into a daily checklist."
        actions={
          <Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            New plan
          </Button>
        }
      />

      {!loading && plans.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <span className="chip">
            <Dumbbell className="h-3.5 w-3.5 text-brand-500" />
            {plans.length} plan{plans.length === 1 ? "" : "s"}
          </span>
          <span className="chip">
            <Clock className="h-3.5 w-3.5 text-cyan-500" />
            {totalExercises} exercises
          </span>
          <span className="chip">
            <Youtube className="h-3.5 w-3.5 text-rose-500" />
            {plans.filter((plan) => plan.videoId).length} with video
          </span>
        </div>
      )}

      {loading ? (
        <CardsSkeleton count={3} />
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-rose-500/15 bg-rose-500/[0.03] px-6 py-14 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => void loadPlans()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Retry
          </Button>
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Your first workout starts here"
          description="Create a plan from any YouTube workout video. Add exercise names and timecodes, then check them off each day."
          action={
            <Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Create a workout plan
            </Button>
          }
          className="card py-16"
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const thumb = youtubeThumbnail(plan.videoId);
            return (
              <article
                key={plan.id}
                className="card group relative overflow-hidden card-hover animate-fade-up"
                style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}
              >
                <Link to={`/workouts/${plan.id}`} className="block">
                  <div className="relative h-40 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-brand-950">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Dumbbell className="h-12 w-12 text-brand-400/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/60 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
                      <Clock className="h-3 w-3 text-brand-300" />
                      {plan.exerciseCount} exercise{plan.exerciseCount === 1 ? "" : "s"}
                    </span>
                    {plan.videoId && (
                      <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition group-hover:bg-brand-400 group-hover:text-slate-950">
                        <Play className="ml-0.5 h-4 w-4" />
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    <h2 className="line-clamp-2 font-display text-base font-semibold tracking-tight text-slate-900 transition group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
                      {plan.title}
                    </h2>
                    <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                      Created {formatRelative(plan.createdAt)}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-200/70 pt-3.5 dark:border-white/[0.06]">
                      <span className="text-xs font-semibold text-brand-600 dark:text-brand-300">
                        Open plan
                      </span>
                      <ArrowRight className="h-4 w-4 text-brand-500 transition group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setDeleteTarget(plan)}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-slate-950/50 text-white/70 opacity-0 backdrop-blur transition hover:bg-rose-500 hover:text-white focus:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
                  aria-label={`Delete ${plan.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </article>
            );
          })}

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 p-6 text-center transition hover:border-brand-400/50 hover:bg-brand-500/[0.02] dark:border-white/10"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500 dark:text-brand-300">
              <Plus className="h-5 w-5" />
            </span>
            <span className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">
              Add another plan
            </span>
            <span className="max-w-[180px] text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
              Build a new checklist from a YouTube workout.
            </span>
          </button>
        </div>
      )}

      <CreatePlanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(plan) => {
          setPlans((current) => [plan, ...current]);
          navigate(`/workouts/${plan.id}`);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete workout plan?"
        description={`"${deleteTarget?.title ?? ""}" and its checklist progress will be removed. This cannot be undone.`}
        confirmLabel="Delete plan"
        loading={deleting}
      />
    </div>
  );
}

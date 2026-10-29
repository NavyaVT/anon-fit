import { useEffect, useState } from "react";
import { Clock, Film, Plus, Sparkles, Trash2, Youtube } from "lucide-react";
import toast from "react-hot-toast";
import { createPlan } from "@/api/health";
import { getErrorMessage } from "@/api/client";
import type { WorkoutPlan } from "@/types";
import { getYouTubeId, youtubeThumbnail } from "@/lib/utils";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Modal from "./ui/Modal";

interface CreatePlanModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (plan: WorkoutPlan) => void;
}

interface ExerciseRow {
  name: string;
  time: string;
}

const emptyExercise: ExerciseRow = { name: "", time: "" };

export default function CreatePlanModal({ open, onClose, onCreated }: CreatePlanModalProps) {
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [exercises, setExercises] = useState<ExerciseRow[]>([{ ...emptyExercise }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoId = getYouTubeId(youtubeUrl);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setYoutubeUrl("");
    setExercises([{ ...emptyExercise }]);
    setError(null);
  }, [open]);

  function updateExercise(index: number, patch: Partial<ExerciseRow>) {
    setExercises((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    );
  }

  function addExercise() {
    if (exercises.length >= 30) {
      toast.error("A plan can have at most 30 exercises");
      return;
    }
    setExercises((current) => [...current, { ...emptyExercise }]);
  }

  function removeExercise(index: number) {
    setExercises((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  /** Accepts "90", "1:30" or "01:02:03". */
  function parseTime(value: string): number | null {
    const raw = value.trim();
    if (!raw) return 0;
    if (!/^\d{1,2}(:\d{1,2}){0,2}$/.test(raw)) return null;
    const parts = raw.split(":").map((part) => Number.parseInt(part, 10));
    if (parts.some((part) => Number.isNaN(part))) return null;
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts[1] > 59 ? null : parts[0] * 60 + parts[1];
    if (parts[1] > 59 || parts[2] > 59) return null;
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Give your workout a title.");
      return;
    }

    const cleaned = exercises.filter((row) => row.name.trim());
    if (cleaned.length === 0) {
      setError("Add at least one exercise.");
      return;
    }

    const payloadExercises: { name: string; startSeconds: number }[] = [];
    for (let index = 0; index < cleaned.length; index += 1) {
      const row = cleaned[index];
      const seconds = parseTime(row.time);
      if (seconds === null) {
        setError(`Timestamp "${row.time}" on exercise ${index + 1} is invalid. Use mm:ss.`);
        return;
      }
      payloadExercises.push({ name: row.name.trim(), startSeconds: seconds });
    }

    setSubmitting(true);
    try {
      const plan = await createPlan({
        title: title.trim(),
        youtubeUrl: youtubeUrl.trim() || undefined,
        exercises: payloadExercises,
      });
      toast.success("Workout plan created");
      onCreated(plan);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Could not create the workout plan"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New workout plan"
      description="Paste a YouTube workout and split it into timestamped exercises."
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-plan-form"
            loading={submitting}
            leftIcon={<Sparkles className="h-4 w-4" />}
          >
            Create plan
          </Button>
        </div>
      }
    >
      <form id="create-plan-form" onSubmit={handleSubmit} className="space-y-5 pt-1">
        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}

        <Input
          label="Plan title"
          placeholder="e.g. 15-minute morning mobility"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={80}
          required
        />

        <div>
          <Input
            label="YouTube URL (optional)"
            placeholder="https://youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            leftIcon={<Youtube className="h-4 w-4" />}
            hint="Private or unlisted videos work as long as the link is valid."
          />
          {videoId && (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-2.5 dark:border-white/[0.07] dark:bg-white/[0.02]">
              <img
                src={youtubeThumbnail(videoId) ?? ""}
                alt="YouTube video preview"
                className="h-12 w-20 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-600 dark:text-brand-300">
                  <Film className="h-3.5 w-3.5" />
                  Video detected
                </p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">
                  {videoId}
                </p>
              </div>
            </div>
          )}
          {youtubeUrl.trim() && !videoId && (
            <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-300">
              This does not look like a valid YouTube link yet.
            </p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label !mb-0">Exercises & timecodes</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {exercises.length}/30
            </span>
          </div>

          <div className="space-y-2">
            {exercises.map((row, index) => (
              <div
                key={index}
                className="flex items-start gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/40 p-2.5 dark:border-white/[0.06] dark:bg-white/[0.015]"
              >
                <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-[10px] font-semibold text-brand-600 dark:text-brand-300">
                  {index + 1}
                </span>
                <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_110px]">
                  <input
                    className="field !py-2.5"
                    placeholder="Exercise name"
                    value={row.name}
                    onChange={(event) => updateExercise(index, { name: event.target.value })}
                    maxLength={80}
                    aria-label={`Exercise ${index + 1} name`}
                  />
                  <div className="relative">
                    <Clock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      className="field !py-2.5 !pl-9 font-mono text-xs"
                      placeholder="0:00"
                      value={row.time}
                      onChange={(event) => updateExercise(index, { time: event.target.value })}
                      aria-label={`Exercise ${index + 1} start time`}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeExercise(index)}
                  disabled={exercises.length === 1}
                  className="mt-1 rounded-xl p-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-30"
                  aria-label={`Remove exercise ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addExercise}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 py-2.5 text-xs font-medium text-slate-500 transition hover:border-brand-400/50 hover:text-brand-600 dark:border-white/10 dark:text-slate-400 dark:hover:text-brand-300"
          >
            <Plus className="h-3.5 w-3.5" />
            Add exercise
          </button>
        </div>

        <div className="rounded-2xl bg-cyan-500/[0.06] px-4 py-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Tip: open the video description, copy each chapter timecode and paste it here.
          Format as <span className="font-mono">mm:ss</span> — for example{" "}
          <span className="font-mono">04:20</span>.
        </div>
      </form>
    </Modal>
  );
}

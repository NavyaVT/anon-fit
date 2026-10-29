import { useEffect, useState } from "react";
import {
  Ban,
  Check,
  Droplets,
  Flame,
  Moon,
  RotateCcw,
  ShieldCheck,
  ShieldX,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getAdminUser,
  setUserStatus,
  softDeleteUser,
} from "@/api/admin";
import { getErrorMessage } from "@/api/client";
import type { AdminUserDetail } from "@/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import {
  formatDate,
  formatDayLabel,
  formatHours,
  formatRelative,
  memberLabel,
} from "@/lib/utils";

type Action = "suspend" | "reactivate" | "delete" | null;

interface AnonUserDetailModalProps {
  open: boolean;
  anonymizedId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

function statusTone(status: string): "brand" | "amber" | "rose" | "slate" {
  if (status === "active") return "brand";
  if (status === "suspended") return "amber";
  if (status === "deleted") return "rose";
  return "slate";
}

export default function AnonUserDetailModal({
  open,
  anonymizedId,
  onClose,
  onChanged,
}: AnonUserDetailModalProps) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [working, setWorking] = useState(false);

  async function load() {
    if (!anonymizedId) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await getAdminUser(anonymizedId, 7));
    } catch (err) {
      setError(getErrorMessage(err, "Could not load this member's profile"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || !anonymizedId) {
      setDetail(null);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anonymizedId]);

  async function handleConfirm() {
    if (!detail || !action) return;
    setWorking(true);
    try {
      if (action === "delete") {
        await softDeleteUser(detail.anonymizedId);
        toast.success("Account deleted");
      } else {
        await setUserStatus(detail.anonymizedId, action === "suspend" ? "suspended" : "active");
        toast.success(action === "suspend" ? "Account paused" : "Account restored");
      }
      setAction(null);
      await load();
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update this account"));
    } finally {
      setWorking(false);
    }
  }

  const confirmCopy = {
    suspend: {
      title: "Pause this member's account?",
      description:
        "They will be signed out everywhere and cannot sign back in until you restore the account. Their health history stays exactly as it is.",
      label: "Pause account",
    },
    reactivate: {
      title: "Restore this account?",
      description:
        "The member can sign in again right away. Their health history is unchanged.",
      label: "Restore account",
    },
    delete: {
      title: "Delete this account?",
      description:
        "The member can never sign in again. Only anonymous health numbers are kept for trends — nothing that identifies them.",
      label: "Delete account",
    },
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Member profile"
        description={
          anonymizedId
            ? `Health history for ${memberLabel(anonymizedId)}. No names or contact details are loaded.`
            : undefined
        }
        size="lg"
        footer={
          detail ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {detail.status !== "deleted" && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setAction("delete")}
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    Delete account
                  </Button>
                )}
                {detail.status === "deleted" && (
                  <p className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                    <ShieldX className="h-3.5 w-3.5" />
                    Soft-deleted accounts cannot be reactivated.
                  </p>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Close
                </Button>
                {detail.status === "active" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setAction("suspend")}
                    leftIcon={<Ban className="h-3.5 w-3.5" />}
                    className="!border-amber-400/30 !text-amber-600 dark:!text-amber-300"
                  >
                    Pause account
                  </Button>
                )}
                {detail.status === "suspended" && (
                  <Button
                    size="sm"
                    onClick={() => setAction("reactivate")}
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  >
                    Reactivate
                  </Button>
                )}
              </div>
            </div>
          ) : null
        }
      >
        {loading ? (
          <div className="space-y-4 pt-1">
            <Skeleton className="h-20 rounded-2xl" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        ) : error || !detail ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {error ?? "Profile unavailable"}
            </p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-5 pt-1">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 dark:border-white/[0.06] dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/20 bg-brand-500/[0.07] px-2.5 py-1 text-xs font-semibold text-brand-700 dark:border-brand-400/20 dark:text-brand-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {memberLabel(detail.anonymizedId)}
                  </span>
                  <Badge tone={statusTone(detail.status)} dot>
                    {detail.status}
                  </Badge>
                </div>
                <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                  Account created {formatDate(detail.createdAt)} · tracking for{" "}
                  {detail.trackingDays} day{detail.trackingDays === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-3 py-2 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Private view
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  icon: Flame,
                  label: "Current streak",
                  value: `${detail.streak}d`,
                  tone: "bg-orange-500/10 text-orange-500",
                },
                {
                  icon: Check,
                  label: "7-day completion",
                  value: `${Math.round(detail.completionRate7d * 100)}%`,
                  tone: "bg-brand-500/10 text-brand-500",
                },
                {
                  icon: Droplets,
                  label: "Tracked days",
                  value: detail.trackingDays,
                  tone: "bg-cyan-500/10 text-cyan-500",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200/70 p-3 dark:border-white/[0.06]"
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl ${stat.tone}`}
                  >
                    <stat.icon className="h-4 w-4" />
                  </span>
                  <p className="mt-2.5 text-[9px] uppercase tracking-wider text-slate-400">
                    {stat.label}
                  </p>
                  <p className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Last 7 days
                </h3>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  Newest first
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200/70 dark:border-white/[0.06]">
                <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_.8fr] gap-3 bg-slate-50/70 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-white/[0.025] sm:grid">
                  <span>Date</span>
                  <span>Water</span>
                  <span>Screen</span>
                  <span>Sleep</span>
                  <span className="text-center">Workout</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {[...detail.history].reverse().map((day) => (
                    <div
                      key={day.date}
                      className="grid grid-cols-2 gap-3 px-3.5 py-2.5 text-xs sm:grid-cols-[1.2fr_1fr_1fr_1fr_.8fr] sm:items-center"
                    >
                      <div>
                        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
                          {formatDayLabel(day.date)}
                        </p>
                        <p className="text-[9px] text-slate-400">
                          {formatRelative(day.updatedAt)}
                        </p>
                      </div>
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Droplets className="h-3 w-3 text-cyan-500 sm:hidden" />
                        {day.waterGlasses}
                      </span>
                      <span className="hidden items-center gap-1.5 text-slate-600 dark:text-slate-300 sm:flex">
                        <Smartphone className="h-3 w-3 text-violet-500" />
                        {day.screenTimeHours != null ? formatHours(day.screenTimeHours) : "—"}
                      </span>
                      <span className="hidden items-center gap-1.5 text-slate-600 dark:text-slate-300 sm:flex">
                        <Moon className="h-3 w-3 text-indigo-500" />
                        {day.sleepHours != null ? formatHours(day.sleepHours) : "—"}
                      </span>
                      <span className="flex justify-end sm:justify-center">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full ${
                            day.workoutCompleted
                              ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                              : "bg-slate-100 text-slate-300 dark:bg-white/[0.05] dark:text-slate-600"
                          }`}
                        >
                          {day.workoutCompleted ? (
                            <Check className="h-3 w-3" strokeWidth={3} />
                          ) : (
                            <X className="h-2.5 w-2.5" />
                          )}
                        </span>
                      </span>
                      <span className="col-span-2 flex items-center gap-3 text-[9px] text-slate-400 sm:hidden">
                        <span>Screen {day.screenTimeHours != null ? formatHours(day.screenTimeHours) : "—"}</span>
                        <span>Sleep {day.sleepHours != null ? formatHours(day.sleepHours) : "—"}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="rounded-2xl bg-slate-50 px-3.5 py-2.5 text-[10px] leading-relaxed text-slate-400 dark:bg-white/[0.02] dark:text-slate-500">
              No email, name, phone number or password is ever shown here. Pausing,
              restoring or deleting an account is written to the audit trail under this
              member's code.
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={action !== null}
        onClose={() => setAction(null)}
        onConfirm={handleConfirm}
        title={action ? confirmCopy[action].title : ""}
        description={action ? confirmCopy[action].description : ""}
        confirmLabel={action ? confirmCopy[action].label : "Confirm"}
        loading={working}
        tone={action === "reactivate" ? "primary" : "danger"}
      />
    </>
  );
}

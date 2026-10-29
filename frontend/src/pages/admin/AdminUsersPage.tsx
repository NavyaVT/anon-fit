import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Ban,
  ChevronLeft,
  ChevronRight,
  Flame,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { getAdminUsers, setUserStatus } from "@/api/admin";
import { getErrorMessage } from "@/api/client";
import AnonUserDetailModal from "@/components/admin/AnonUserDetailModal";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import type { AdminUsersPage as AdminUsersData, AnonUserRow, AccountStatus } from "@/types";
import { formatDayLabel, formatHours, formatRelative, memberLabel } from "@/lib/utils";

type StatusFilter = "all" | AccountStatus;

const filters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Paused" },
  { value: "deleted", label: "Deleted" },
];

function statusTone(status: AccountStatus): "brand" | "amber" | "rose" | "slate" {
  if (status === "active") return "brand";
  if (status === "suspended") return "amber";
  if (status === "deleted") return "rose";
  return "slate";
}

export default function AdminUsersPage() {
  const [data, setData] = useState<AdminUsersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    row: AnonUserRow;
    next: "active" | "suspended";
  } | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getAdminUsers({
      page,
      limit: 10,
      status: filter,
      search: debouncedSearch || undefined,
    })
      .then((response) => {
        if (active) setData(response);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, "Could not load members"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, filter, debouncedSearch, refreshKey]);

  function changeFilter(next: StatusFilter) {
    setFilter(next);
    setPage(1);
  }

  async function handleStatusChange() {
    if (!confirmAction) return;
    setWorking(true);
    try {
      await setUserStatus(confirmAction.row.anonymizedId, confirmAction.next);
      toast.success(
        confirmAction.next === "suspended" ? "Account paused" : "Account restored",
      );
      setConfirmAction(null);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update the account"));
    } finally {
      setWorking(false);
    }
  }

  const start = data && data.total > 0 ? (data.page - 1) * data.limit + 1 : 0;
  const end = data ? Math.min(data.page * data.limit, data.total) : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Members"
        title="Members"
        description="Each member appears here under a private code only. Review health trends and manage accounts without ever seeing a name, email or password."
        actions={
          <span className="chip">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
            No personal details stored
          </span>
        }
      />

      <div className="card overflow-hidden animate-fade-up">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 p-4 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => changeFilter(item.value)}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition ${
                  filter === item.value
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "text-slate-400 hover:bg-slate-900/[0.03] hover:text-slate-700 dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="sm:w-64">
            <Input
              placeholder="Search by member code…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              aria-label="Search by member code"
              className="!py-2.5 !text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setRefreshKey((key) => key + 1)}
            >
              Retry
            </Button>
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members found"
            description={
              debouncedSearch
                ? "No member code matches that search. Try a different fragment."
                : "Once members start tracking, their anonymous profiles appear here."
            }
            className="border-0 py-14"
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200/70 bg-slate-50/50 text-[9px] uppercase tracking-[0.14em] text-slate-400 dark:border-white/[0.06] dark:bg-white/[0.015]">
                    <th className="px-4 py-3 font-semibold">Member</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Latest check-in</th>
                    <th className="px-4 py-3 font-semibold">7-day completion</th>
                    <th className="px-4 py-3 font-semibold">Streak</th>
                    <th className="px-4 py-3 font-semibold">Last active</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {data.items.map((row) => {
                    const pct = Math.round(row.completionRate7d * 100);
                    return (
                      <tr
                        key={row.anonymizedId}
                        className="group cursor-pointer transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                        onClick={() => setSelectedId(row.anonymizedId)}
                      >
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/20 bg-brand-500/[0.07] px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:border-brand-400/20 dark:text-brand-300">
                            {memberLabel(row.anonymizedId)}
                          </span>
                          <p className="mt-1 text-[9px] text-slate-400">
                            Joined {formatRelative(row.createdAt)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={statusTone(row.status)} dot>
                            {row.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {row.latest ? (
                            <>
                              <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
                                {formatDayLabel(row.latest.date)}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                {row.latest.screenTimeHours != null
                                  ? `${formatHours(row.latest.screenTimeHours)} screen`
                                  : "No screen data"}
                                {" · "}
                                {row.latest.sleepHours != null
                                  ? `${formatHours(row.latest.sleepHours)} sleep`
                                  : "No sleep data"}
                              </p>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400">No check-ins</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/[0.07]">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-cyan-400"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                              {pct}%
                            </span>
                          </div>
                          <p className="mt-1 text-[9px] text-slate-400">
                            {row.trackingDays} tracked days
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                            <Flame
                              className={`h-3.5 w-3.5 ${
                                row.streak > 0 ? "text-orange-500" : "text-slate-300"
                              }`}
                            />
                            {row.streak}d
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[10px] text-slate-400 dark:text-slate-500">
                          {formatRelative(row.lastActiveAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {row.status === "active" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="!px-2 !py-1.5 !text-[10px] !text-amber-600 dark:!text-amber-300"
                                leftIcon={<Ban className="h-3 w-3" />}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setConfirmAction({ row, next: "suspended" });
                                }}
                              >
                                Pause
                              </Button>
                            )}
                            {row.status === "suspended" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="!px-2 !py-1.5 !text-[10px] !text-brand-600 dark:!text-brand-300"
                                leftIcon={<RotateCcw className="h-3 w-3" />}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setConfirmAction({ row, next: "active" });
                                }}
                              >
                                Restore
                              </Button>
                            )}
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition group-hover:bg-slate-900/[0.04] group-hover:text-slate-600 dark:group-hover:bg-white/[0.05] dark:group-hover:text-slate-200">
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04] md:hidden">
              {data.items.map((row) => {
                const pct = Math.round(row.completionRate7d * 100);
                return (
                  <div key={row.anonymizedId} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedId(row.anonymizedId)}
                        className="min-w-0 text-left"
                      >
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/20 bg-brand-500/[0.07] px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:border-brand-400/20 dark:text-brand-300">
                          {memberLabel(row.anonymizedId)}
                        </span>
                        <p className="mt-1.5 text-[9px] text-slate-400">
                          Joined {formatRelative(row.createdAt)} · active{" "}
                          {formatRelative(row.lastActiveAt)}
                        </p>
                      </button>
                      <Badge tone={statusTone(row.status)} dot>
                        {row.status}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-white/[0.025]">
                        <p className="text-[8px] uppercase tracking-wider text-slate-400">Screen</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                          {row.latest?.screenTimeHours != null
                            ? formatHours(row.latest.screenTimeHours)
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-white/[0.025]">
                        <p className="text-[8px] uppercase tracking-wider text-slate-400">Sleep</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                          {row.latest?.sleepHours != null
                            ? formatHours(row.latest.sleepHours)
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-white/[0.025]">
                        <p className="text-[8px] uppercase tracking-wider text-slate-400">Streak</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                          <Flame
                            className={`h-3 w-3 ${
                              row.streak > 0 ? "text-orange-500" : "text-slate-300"
                            }`}
                          />
                          {row.streak}d
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/[0.07]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-cyan-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400">{pct}% / 7d</span>
                      </div>
                      <div className="flex gap-1.5">
                        {row.status === "active" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="!px-2.5 !py-1.5 !text-[10px]"
                            onClick={() => setConfirmAction({ row, next: "suspended" })}
                          >
                            Pause
                          </Button>
                        )}
                        {row.status === "suspended" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="!px-2.5 !py-1.5 !text-[10px]"
                            onClick={() => setConfirmAction({ row, next: "active" })}
                          >
                            Restore
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!px-2.5 !py-1.5 !text-[10px]"
                          onClick={() => setSelectedId(row.anonymizedId)}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {data && data.total > 0 && !loading && !error && (
          <div className="flex flex-col gap-2 border-t border-slate-200/80 px-4 py-3 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Showing {start}–{end} of {data.total} member{data.total === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
              >
                Previous
              </Button>
              <span className="px-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                {data.page} / {Math.max(data.pages, 1)}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => setPage((current) => current + 1)}
                rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 flex items-start gap-2 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        This list is built from anonymous member codes and health numbers only — no
        email, name or phone number is ever requested or shown.
      </p>

      <AnonUserDetailModal
        open={selectedId !== null}
        anonymizedId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={() => setRefreshKey((key) => key + 1)}
      />

      <ConfirmDialog
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleStatusChange}
        title={
          confirmAction?.next === "suspended"
            ? "Pause this member's account?"
            : "Restore this account?"
        }
        description={
          confirmAction?.next === "suspended"
            ? "They will be signed out everywhere and cannot sign back in until you restore the account."
            : "They can sign in again right away. Their health history is unchanged."
        }
        confirmLabel={confirmAction?.next === "suspended" ? "Pause account" : "Restore account"}
        loading={working}
        tone={confirmAction?.next === "suspended" ? "danger" : "primary"}
      />
    </div>
  );
}

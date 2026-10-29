import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  FileClock,
  LogIn,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";
import { getAuditLogs } from "@/api/admin";
import { getErrorMessage } from "@/api/client";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import type { AuditEntry, AuditPage } from "@/types";
import {
  ACTION_LABELS,
  cn,
  formatDate,
  formatRelative,
  memberLabel,
} from "@/lib/utils";

const PAGE_SIZE = 15;

type ActionFilter = "all" | "admin.login" | "user.suspend" | "user.reactivate" | "user.soft_delete";

const FILTERS: { value: ActionFilter; label: string }[] = [
  { value: "all", label: "All actions" },
  { value: "admin.login", label: "Sign-ins" },
  { value: "user.suspend", label: "Pauses" },
  { value: "user.reactivate", label: "Restores" },
  { value: "user.soft_delete", label: "Deletions" },
];

const ACTION_ICONS: Record<string, typeof LogIn> = {
  "admin.login": LogIn,
  "user.suspend": Ban,
  "user.reactivate": RotateCcw,
  "user.soft_delete": Trash2,
};

const ACTION_TONES: Record<
  string,
  { chip: string; icon: string; border: string; badge: "brand" | "amber" | "rose" | "cyan" | "slate" }
> = {
  "admin.login": {
    chip: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    icon: "border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
    border: "before:bg-cyan-400/70",
    badge: "cyan",
  },
  "user.suspend": {
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    border: "before:bg-amber-400/70",
    badge: "amber",
  },
  "user.reactivate": {
    chip: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
    icon: "border-brand-500/20 bg-brand-500/10 text-brand-600 dark:text-brand-300",
    border: "before:bg-brand-400/70",
    badge: "brand",
  },
  "user.soft_delete": {
    chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    icon: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    border: "before:bg-rose-400/70",
    badge: "rose",
  },
};

const FALLBACK_TONE = {
  chip: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  icon: "border-slate-500/20 bg-slate-500/10 text-slate-500 dark:text-slate-300",
  border: "before:bg-slate-400/60",
  badge: "slate" as const,
};

function metadataSummary(entry: AuditEntry): string | null {
  const previous = entry.metadata?.previousStatus;
  if (typeof previous === "string" && previous) {
    return `Previous status: ${previous}`;
  }
  return null;
}

export default function AdminAuditPage() {
  const [data, setData] = useState<AuditPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ActionFilter>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAuditLogs({
        page,
        limit: PAGE_SIZE,
        action: filter === "all" ? undefined : filter,
      });
      setData(response);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load the audit log"));
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  function changeFilter(next: ActionFilter) {
    setFilter(next);
    setPage(1);
  }

  const start = data && data.total > 0 ? (data.page - 1) * data.limit + 1 : 0;
  const end = data ? Math.min(data.page * data.limit, data.total) : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Governance"
        title="Audit trail"
        description="An immutable record of administrator sign-ins and account changes. Members appear as private codes only — never names or emails."
        actions={
          <>
            <span className="chip">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
              No personal details recorded
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRefreshKey((key) => key + 1)}
              leftIcon={<RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />}
              disabled={loading}
            >
              Refresh
            </Button>
          </>
        }
      />

      <div className="card overflow-hidden animate-fade-up">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200/80 p-3 no-scrollbar dark:border-white/[0.06]">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => changeFilter(item.value)}
              className={cn(
                "shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition",
                filter === item.value
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "text-slate-400 hover:bg-slate-900/[0.03] hover:text-slate-700 dark:hover:bg-white/[0.04] dark:hover:text-slate-200",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setRefreshKey((key) => key + 1)}
            >
              Try again
            </Button>
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={FileClock}
            title="No audit entries"
            description={
              filter === "all"
                ? "Administrator sign-ins and account actions will be recorded here."
                : "No actions of this type have been recorded yet."
            }
            action={
              filter !== "all" ? (
                <Button variant="secondary" size="sm" onClick={() => changeFilter("all")}>
                  Show all actions
                </Button>
              ) : undefined
            }
            className="border-0 py-14"
          />
        ) : (
          <ol className="relative p-4 sm:p-5">
            <span
              aria-hidden="true"
              className="absolute bottom-6 left-[2.05rem] top-8 w-px bg-slate-200/80 dark:bg-white/[0.07] sm:left-[2.55rem]"
            />
            {data.items.map((entry, index) => {
              const tone = ACTION_TONES[entry.action] ?? FALLBACK_TONE;
              const Icon = ACTION_ICONS[entry.action] ?? UserCog;
              const summary = metadataSummary(entry);
              return (
                <li
                  key={entry.id}
                  className="relative animate-fade-up pb-4 pl-12 last:pb-0 sm:pl-14"
                  style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-2xl border sm:h-10 sm:w-10",
                      tone.icon,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <div className="card rounded-2xl border-slate-200/70 bg-white/40 p-3.5 transition hover:border-slate-300/80 dark:border-white/[0.06] dark:bg-white/[0.02] sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                          {formatRelative(entry.createdAt)} ·{" "}
                          {formatDate(entry.createdAt, "MMM D, YYYY · HH:mm")}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wider",
                          tone.chip,
                        )}
                      >
                        {entry.action}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50/80 px-3 py-2 dark:bg-white/[0.025]">
                        <p className="text-[8px] uppercase tracking-[0.14em] text-slate-400">
                          Administrator
                        </p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          {memberLabel(entry.actorAnonymizedId)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50/80 px-3 py-2 dark:bg-white/[0.025]">
                        <p className="text-[8px] uppercase tracking-[0.14em] text-slate-400">
                          Affected member
                        </p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          {entry.targetAnonymizedId ? memberLabel(entry.targetAnonymizedId) : "—"}
                        </p>
                      </div>
                    </div>

                    {summary && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone={tone.badge}>{summary}</Badge>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {data && data.total > 0 && !loading && !error && (
          <div className="flex flex-col gap-2 border-t border-slate-200/80 px-4 py-3 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Showing {start}–{end} of {data.total} entr{data.total === 1 ? "y" : "ies"}
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
        Entries are added automatically whenever an administrator signs in or changes an
        account, and can never be edited or removed. Members appear as private codes only,
        with no names or contact details anywhere in the trail.
      </p>
    </div>
  );
}

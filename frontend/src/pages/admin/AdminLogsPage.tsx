import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Fingerprint,
  RefreshCw,
  Search,
  ShieldAlert,
  Terminal,
  TriangleAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import { backupSystemLogs, getLogStats, getSystemLogs } from "@/api/admin";
import { getErrorMessage } from "@/api/client";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import type {
  LogCategory,
  LogLevel,
  SystemLogEntry,
  SystemLogPage,
  SystemLogStats,
} from "@/types";
import {
  attemptCode,
  cn,
  formatDate,
  formatRelative,
  memberLabel,
} from "@/lib/utils";

const PAGE_SIZE = 20;

type CategoryFilter = "all" | LogCategory;
type LevelFilter = "all" | "debug" | "info" | "warning" | "error";

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All events" },
  { value: "security", label: "Security" },
  { value: "auth", label: "Auth" },
  { value: "admin", label: "Admin" },
  { value: "data", label: "Data" },
  { value: "system", label: "System" },
];

const LEVEL_FILTERS: { value: LevelFilter; label: string }[] = [
  { value: "all", label: "Any level" },
  { value: "warning", label: "Warnings+" },
  { value: "error", label: "Errors" },
  { value: "info", label: "Info" },
  { value: "debug", label: "Debug" },
];

const LEVEL_TONES: Record<
  LogLevel,
  { badge: "slate" | "cyan" | "amber" | "rose" | "violet"; bar: string }
> = {
  debug: { badge: "slate", bar: "bg-slate-400/70" },
  info: { badge: "cyan", bar: "bg-cyan-400/70" },
  warning: { badge: "amber", bar: "bg-amber-400/80" },
  error: { badge: "rose", bar: "bg-rose-500/80" },
  critical: { badge: "rose", bar: "bg-rose-600" },
};

const CATEGORY_LABELS: Record<string, string> = {
  security: "Security",
  auth: "Authentication",
  admin: "Administration",
  data: "Health data",
  system: "System",
};

/** Plain-language titles for the events this app records. */
const EVENT_LABELS: Record<string, string> = {
  "system.startup": "Service started",
  "system.shutdown": "Service stopped",
  "system.seed_users": "Sample data prepared",
  "auth.registered": "New account created",
  "auth.login": "Member signed in",
  "auth.admin_login": "Administrator signed in",
  "auth.logout": "Signed out",
  "auth.logout_all": "Signed out everywhere",
  "auth.login_failed": "Wrong password",
  "auth.login_blocked": "Sign-in temporarily blocked",
  "auth.login_denied": "Sign-in refused",
  "auth.account_locked": "Account locked",
  "auth.privilege_denied": "Access refused",
  "auth.register_rejected": "Registration refused",
  "auth.refresh_reuse": "Old sign-in token reused",
  "auth.password_changed": "Password changed",
  "auth.password_change_failed": "Password change refused",
  "auth.passkey_registered": "Fingerprint sign-in enabled",
  "auth.passkey_login": "Signed in with fingerprint",
  "auth.passkey_unlocked": "Unlocked with fingerprint",
  "auth.passkey_removed": "Fingerprint sign-in removed",
  "auth.passkey_failed": "Fingerprint sign-in failed",
  "auth.passkey_register_failed": "Fingerprint enrolment failed",
  "auth.passkey_unlock_failed": "Fingerprint unlock failed",
  "auth.pin_set": "Unlock PIN enabled",
  "auth.pin_changed": "Unlock PIN changed",
  "auth.pin_change_failed": "PIN change refused",
  "auth.pin_removed": "Unlock PIN removed",
  "auth.pin_unlocked": "Unlocked with PIN",
  "auth.pin_failed": "Wrong PIN at the privacy lock",
  "auth.pin_locked": "PIN unlock temporarily blocked",
  "user.suspend": "Account suspended",
  "user.reactivate": "Account reactivated",
  "user.soft_delete": "Account deleted",
  "logs.backup": "Log copy saved",
  "health.metrics_saved": "Daily numbers saved",
  "health.water_updated": "Water intake updated",
  "workout.plan_created": "Workout plan created",
  "workout.plan_deleted": "Workout plan deleted",
  "workout.completed": "Workout completed",
};

function eventTitle(entry: SystemLogEntry): string {
  return EVENT_LABELS[entry.event] ?? entry.event;
}

/** Who the event is about, in plain words — never the raw identifier. */
function actorText(entry: SystemLogEntry): string {
  if (entry.actorAnonymizedId) return memberLabel(entry.actorAnonymizedId);
  if (entry.identifierFingerprint) return "Unknown account";
  return "—";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function metadataSummary(metadata: Record<string, unknown>): string | null {
  const entries = Object.entries(metadata ?? {}).filter(([, value]) => value != null);
  if (entries.length === 0) return null;
  return entries
    .slice(0, 4)
    .map(([key, value]) => `${METADATA_LABELS[key] ?? key}: ${metadataValue(value)}`)
    .join(" · ");
}

/** Friendly names for the metadata keys this app records. */
const METADATA_LABELS: Record<string, string> = {
  target: "Member",
  previousStatus: "Was",
  attempts: "Attempts",
  attemptsUsed: "Attempts used",
  file: "File",
  exported: "Events saved",
  removed: "Events cleared",
  reason: "Reason",
  plan: "Plan",
  day: "Day",
};

/** Show identifiers as short member codes instead of raw references. */
function metadataValue(value: unknown): string {
  const text = String(value);
  if (/^anon_/i.test(text)) return memberLabel(text);
  if (/^fp_/i.test(text)) return attemptCode(text) ?? "—";
  return text;
}

function LevelBadge({ level }: { level: LogLevel }) {
  return (
    <Badge tone={LEVEL_TONES[level]?.badge ?? "slate"} dot>
      {level}
    </Badge>
  );
}

export default function AdminLogsPage() {
  const [data, setData] = useState<SystemLogPage | null>(null);
  const [stats, setStats] = useState<SystemLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [backupOpen, setBackupOpen] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pageData, statsData] = await Promise.all([
        getSystemLogs({
          page,
          limit: PAGE_SIZE,
          category: category === "all" ? undefined : category,
          level: level === "all" ? undefined : level,
          search: query || undefined,
        }),
        getLogStats(),
      ]);
      setData(pageData);
      setStats(statsData);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load the system log"));
    } finally {
      setLoading(false);
    }
  }, [page, category, level, query]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function runBackup() {
    setBackingUp(true);
    setBackupError(null);
    try {
      const { filename, count } = await backupSystemLogs();
      setBackupOpen(false);
      setPage(1);
      setRefreshKey((key) => key + 1);
      toast.success(
        `Saved ${count} event${count === 1 ? "" : "s"} to ${filename}. The log is now starting fresh.`,
      );
    } catch (err) {
      setBackupError(getErrorMessage(err, "Could not save the log backup"));
    } finally {
      setBackingUp(false);
    }
  }

  function changeCategory(next: CategoryFilter) {
    setCategory(next);
    setPage(1);
  }

  function changeLevel(next: LevelFilter) {
    setLevel(next);
    setPage(1);
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setQuery(search.trim());
    setPage(1);
  }

  const start = data && data.total > 0 ? (data.page - 1) * data.limit + 1 : 0;
  const end = data ? Math.min(data.page * data.limit, data.total) : 0;

  const levelSummary = useMemo(() => {
    const map = new Map<string, number>();
    stats?.byLevel.forEach((item) => map.set(item.level, item.count));
    return map;
  }, [stats]);

  return (
    <div>
      <PageHeader
        eyebrow="Observability"
        title="Activity & security log"
        description="Every sign-in, security and data event, kept in the cloud. Save a copy as a log file whenever you like — the log then starts fresh."
        actions={
          <>
            <span className="chip">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              Stored securely in the cloud
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setBackupError(null);
                setBackupOpen(true);
              }}
              leftIcon={<Download className="h-3.5 w-3.5" />}
              disabled={loading}
            >
              Save a copy
            </Button>
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

      {/* Summary tiles */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "Total events", value: stats?.total ?? 0, icon: Terminal, tone: "text-slate-500" },
          { label: "Last 24 hours", value: stats?.last24h ?? 0, icon: RefreshCw, tone: "text-cyan-500" },
          { label: "Warnings", value: stats?.warnings24h ?? 0, icon: TriangleAlert, tone: "text-amber-500" },
          { label: "Security events", value: stats?.securityEvents24h ?? 0, icon: ShieldAlert, tone: "text-rose-500" },
        ].map((tile) => (
          <div key={tile.label} className="card rounded-2xl p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                {tile.label}
              </p>
              <tile.icon className={cn("h-3.5 w-3.5 shrink-0", tile.tone)} />
            </div>
            <p className="mt-1.5 font-display text-lg font-semibold text-slate-900 dark:text-white">
              {loading ? "—" : tile.value}
            </p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden animate-fade-up">
        {/* Filters */}
        <div className="space-y-2 border-b border-slate-200/80 p-3 dark:border-white/[0.06]">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {CATEGORY_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => changeCategory(item.value)}
                className={cn(
                  "shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition",
                  category === item.value
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "text-slate-400 hover:bg-slate-900/[0.03] hover:text-slate-700 dark:hover:bg-white/[0.04] dark:hover:text-slate-200",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {LEVEL_FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => changeLevel(item.value)}
                  className={cn(
                    "shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition",
                    level === item.value
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <form onSubmit={submitSearch} className="flex flex-1 items-center gap-2">
              <Input
                aria-label="Search logs"
                placeholder="Search event, message or ID…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
                className="h-9"
              />
              <Button type="submit" variant="secondary" size="sm">
                Search
              </Button>
            </form>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-12 rounded-xl" />
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
            icon={Terminal}
            title="No log entries match"
            description="Adjust the category, level or search term — every backend event is recorded here."
            className="border-0 py-14"
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-slate-200/70 text-[9px] uppercase tracking-[0.14em] text-slate-400 dark:border-white/[0.06] dark:text-slate-500">
                    <th className="px-4 py-2.5 font-semibold">Time</th>
                    <th className="px-2 py-2.5 font-semibold">Level</th>
                    <th className="px-2 py-2.5 font-semibold">Event</th>
                    <th className="px-2 py-2.5 font-semibold">Message</th>
                    <th className="px-4 py-2.5 font-semibold">Member</th>
                    <th className="w-8 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((entry) => (
                    <LogRow
                      key={entry.id}
                      entry={entry}
                      expanded={expanded === entry.id}
                      onToggle={() => setExpanded(expanded === entry.id ? null : entry.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-slate-200/70 md:hidden dark:divide-white/[0.05]">
              {data.items.map((entry) => (
                <LogCard
                  key={entry.id}
                  entry={entry}
                  expanded={expanded === entry.id}
                  onToggle={() => setExpanded(expanded === entry.id ? null : entry.id)}
                />
              ))}
            </ul>
          </>
        )}

        {data && data.total > 0 && !loading && !error && (
          <div className="flex flex-col gap-2 border-t border-slate-200/80 px-4 py-3 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Showing {start}–{end} of {data.total} event{data.total === 1 ? "" : "s"}
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

      {stats && stats.byLevel.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            Volume by level
          </span>
          {stats.byLevel.map((item) => (
            <Badge key={item.level} tone={LEVEL_TONES[item.level as LogLevel]?.badge ?? "slate"}>
              {item.level} · {levelSummary.get(item.level) ?? item.count}
            </Badge>
          ))}
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
        <Fingerprint className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        Sign-ins from an unknown email are recorded with a short, one-way code instead of the
        address itself, so repeated attempts can be spotted without keeping anyone's email in
        the log.
      </p>

      <Modal
        open={backupOpen}
        onClose={() => {
          if (!backingUp) setBackupOpen(false);
        }}
        title="Save a copy of the log"
        description="The current log is saved as a readable text file on your device"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] px-3.5 py-3 text-[11px] font-medium leading-relaxed text-amber-700 dark:text-amber-300">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              This saves <strong>{stats?.total ?? 0}</strong> stored event
              {(stats?.total ?? 0) === 1 ? "" : "s"} to a text file on your device, then
              clears them from the log. Anything that happens afterwards is recorded from
              scratch, so nothing is missed.
            </span>
          </div>

          {backupError && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-300">
              {backupError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBackupOpen(false)}
              disabled={backingUp}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void runBackup()}
              loading={backingUp}
              leftIcon={<Download className="h-3.5 w-3.5" />}
            >
              Save file &amp; start fresh
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function LogRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: SystemLogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const summary = metadataSummary(entry.metadata);
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          "cursor-pointer border-b border-slate-200/60 text-[11px] transition last:border-0 hover:bg-slate-900/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.02]",
          expanded && "bg-slate-900/[0.02] dark:bg-white/[0.03]",
        )}
      >
        <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
          <span className="block text-[11px] font-medium text-slate-700 dark:text-slate-200">
            {formatRelative(entry.createdAt)}
          </span>
          <span className="text-[9px] text-slate-400 dark:text-slate-500">
            {formatDate(entry.createdAt, "MMM D · HH:mm:ss")}
          </span>
        </td>
        <td className="px-2 py-2.5">
          <LevelBadge level={entry.level} />
        </td>
        <td className="px-2 py-2.5">
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
            {eventTitle(entry)}
          </span>
          <span className="mt-0.5 block text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {CATEGORY_LABELS[entry.category] ?? entry.category}
          </span>
        </td>
        <td className="max-w-[320px] px-2 py-2.5 text-slate-600 dark:text-slate-300">
          <span className="line-clamp-2">{entry.message}</span>
        </td>
        <td className="px-4 py-2.5">
          <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
            {actorText(entry)}
          </span>
        </td>
        <td className="px-2 py-2.5 text-slate-400">
          <ChevronDown className={cn("h-3.5 w-3.5 transition", expanded && "rotate-180")} />
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-slate-200/60 bg-slate-900/[0.015] dark:border-white/[0.04] dark:bg-white/[0.02]">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Detail label="Member" value={memberLabel(entry.actorAnonymizedId)} />
              <Detail
                label="Repeated unknown sign-in"
                value={attemptCode(entry.identifierFingerprint) ?? "—"}
              />
            </div>
            <div className="mt-2 rounded-xl bg-slate-950/90 p-2.5 font-mono text-[10px] text-slate-300">
              {summary ?? "No extra details"}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function LogCard({
  entry,
  expanded,
  onToggle,
}: {
  entry: SystemLogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tone = LEVEL_TONES[entry.level] ?? LEVEL_TONES.info;
  const summary = metadataSummary(entry.metadata);

  return (
    <li className="relative">
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <span className={cn("mt-1 h-8 w-1 shrink-0 rounded-full", tone.bar)} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <LevelBadge level={entry.level} />
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              {eventTitle(entry)}
            </span>
          </span>
          <span className="mt-1 block text-[11px] leading-snug text-slate-600 dark:text-slate-300">
            {entry.message}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-[9px] text-slate-400 dark:text-slate-500">
            <span>{formatRelative(entry.createdAt)}</span>
            <span>·</span>
            <span>{CATEGORY_LABELS[entry.category] ?? entry.category}</span>
            {(entry.actorAnonymizedId || entry.identifierFingerprint) && (
              <>
                <span>·</span>
                <span className="truncate">{actorText(entry)}</span>
              </>
            )}
          </span>
        </span>
        <ChevronDown
          className={cn("mt-1 h-4 w-4 shrink-0 text-slate-400 transition", expanded && "rotate-180")}
        />
      </button>
      {expanded && (
        <div className="px-4 pb-3 pl-8">
          <div className="rounded-xl bg-slate-900/[0.03] p-2.5 dark:bg-white/[0.03]">
            <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Details</p>
            <p className="mt-1 break-words font-mono text-[10px] text-slate-600 dark:text-slate-300">
              {summary ?? "No extra details"}
            </p>
          </div>
        </div>
      )}
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50/80 px-3 py-2 dark:bg-white/[0.025]">
      <p className="text-[8px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-0.5 truncate font-mono text-[10px] font-medium text-slate-600 dark:text-slate-300">
        {value}
      </p>
    </div>
  );
}

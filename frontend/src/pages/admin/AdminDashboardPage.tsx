import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Ban,
  Droplets,
  Moon,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Target,
  UserCheck,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { getAdminStats, getAuditLogs } from "@/api/admin";
import { getErrorMessage } from "@/api/client";
import AdminWeeklyChart from "@/components/admin/AdminWeeklyChart";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import StatCard from "@/components/ui/StatCard";
import type { AdminStats, AuditEntry } from "@/types";
import { ACTION_LABELS, formatHours, formatRelative, memberLabel } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activity, setActivity] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, auditData] = await Promise.all([
        getAdminStats(),
        getAuditLogs({ page: 1, limit: 5 }),
      ]);
      setStats(statsData);
      setActivity(auditData.items);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load admin analytics"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div>
        <PageHeader
          eyebrow="Overview"
          title="Welcome back"
          description="Health trends built from anonymous numbers only."
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-3xl" />
          ))}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-3xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {error ?? "Analytics unavailable"}
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
        eyebrow="Overview"
        title="Welcome back"
        description="How the platform and its members are doing, based on anonymous health numbers only — no names, emails or passwords are ever loaded here."
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

      <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3 animate-fade-up">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-300" />
        <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-amber-700 dark:text-amber-300">
            Members stay private.
          </span>{" "}
          This dashboard only sees anonymous member codes and health numbers. Every
          action you take is recorded in the audit log under your own admin code.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={UserCheck}
          label="Active users"
          value={stats.activeUsers}
          hint={`${stats.totalUsers} total`}
          tone="brand"
        />
        <StatCard
          icon={Smartphone}
          label="Avg screen time"
          value={formatHours(stats.avgScreenTimeHours)}
          hint="7-day avg"
          tone="violet"
        />
        <StatCard
          icon={Moon}
          label="Avg sleep"
          value={formatHours(stats.avgSleepHours)}
          hint="7-day avg"
          tone="cyan"
        />
        <StatCard
          icon={Target}
          label="Workout completion"
          value={`${Math.round(stats.workoutCompletionRate * 100)}%`}
          hint="of check-ins"
          tone="amber"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            icon: Users,
            label: "Paused",
            value: stats.suspendedUsers,
          },
          { icon: Ban, label: "Deleted", value: stats.deletedUsers },
          {
            icon: Droplets,
            label: "Avg water",
            value: `${stats.avgWaterGlasses} glasses`,
          },
          { icon: Target, label: "Tracked check-ins", value: stats.trackedDays },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2.5 rounded-2xl border border-slate-200/70 bg-white/40 px-3 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.02]"
          >
            <item.icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
            <div className="min-w-0">
              <p className="truncate text-[9px] uppercase tracking-wider text-slate-400">
                {item.label}
              </p>
              <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="card card-pad animate-fade-up lg:col-span-2">
          <AdminWeeklyChart points={stats.weekly} />
        </section>

        <section className="card card-pad animate-fade-up [animation-delay:80ms]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="section-title">Recent admin actions</h3>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Who did what, and when
              </p>
            </div>
            <Link
              to="/admin/audit"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-amber-400/40 hover:text-amber-600 dark:border-white/10 dark:text-slate-400"
              aria-label="Open audit log"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 space-y-1">
            {activity.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
                No admin actions recorded yet.
              </p>
            ) : (
              activity.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-slate-900/[0.025] dark:hover:bg-white/[0.03]"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-400 dark:text-slate-500">
                      {memberLabel(entry.targetAnonymizedId ?? entry.actorAnonymizedId)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[9px] text-slate-400 dark:text-slate-500">
                    {formatRelative(entry.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>

          <Link to="/admin/users">
            <Button variant="secondary" size="sm" className="mt-4 w-full">
              Review members
            </Button>
          </Link>
        </section>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          to="/admin/users"
          className="card card-hover flex items-center gap-3 p-4 animate-fade-up"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
            <Users className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              Members
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
              Pause, restore or review 7-day health trends
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link
          to="/admin/audit"
          className="card card-hover flex items-center gap-3 p-4 animate-fade-up [animation-delay:60ms]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
            <ShieldCheck className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              Governance audit trail
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
              Every sign-in and lifecycle action, by anon ID
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </Link>
      </div>

      <p className="mt-4 text-center text-[10px] text-slate-400 dark:text-slate-600">
        Aggregates generated {formatRelative(stats.generatedAt)} · source: health_data
      </p>
    </div>
  );
}

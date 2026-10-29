import { useNavigate, NavLink, Outlet } from "react-router-dom";
import {
  BarChart3,
  Dumbbell,
  Fingerprint,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";
import { logoutSession } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import Logo from "@/components/Logo";
import BiometricLock from "@/components/BiometricLock";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AnonIdChip from "@/components/AnonIdChip";
import { cn, initials } from "@/lib/utils";

const navigation = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/workouts", label: "Workouts", icon: Dumbbell },
  { to: "/tracking", label: "Tracking", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: UserRound },
];

export default function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const lock = useAuthStore((state) => state.lock);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      if (refreshToken) await logoutSession(refreshToken);
    } catch {
      // Local sign-out should always succeed.
    } finally {
      clearSession();
      navigate("/login", { replace: true });
      toast.success("Signed out");
    }
  }

  return (
    <div className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-32 top-0 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-cyan-500/[0.07] blur-3xl" />
      </div>

      {/* ---------------------------- Desktop sidebar --------------------------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-200/80 bg-white/70 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#080d18]/80 lg:flex">
        <div className="px-6 pb-2 pt-7">
          <Logo />
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
            Private health companion
          </p>
        </div>

        <nav className="mt-6 flex-1 space-y-1.5 px-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            Menu
          </p>
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  isActive
                    ? "bg-brand-500/[0.09] text-brand-700 dark:bg-brand-400/[0.1] dark:text-white"
                    : "text-slate-500 hover:bg-slate-900/[0.035] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-white",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-400 to-cyan-400" />
                  )}
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] transition",
                      isActive
                        ? "text-brand-600 dark:text-brand-300"
                        : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200",
                    )}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white/70 p-4 dark:border-white/[0.07] dark:bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400/25 to-cyan-400/20 font-display text-xs font-semibold text-brand-700 dark:text-brand-200">
                {user ? initials(user.email) : "AF"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                  {user?.email}
                </p>
                <div className="mt-1">
                  <AnonIdChip
                    anonymizedId={user?.anonymizedId ?? ""}
                    showCopy={false}
                    className="!py-0.5 !pl-1.5 !pr-2 !text-[10px]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <ThemeToggle className="h-9 w-9" />
              {user?.biometricEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    lock();
                    toast("App locked");
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-brand-400/40 hover:text-brand-600 dark:border-white/10 dark:text-slate-400 dark:hover:text-brand-300"
                  title="Lock now"
                  aria-label="Lock now"
                >
                  <LockKeyhole className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[11px] font-medium text-slate-500 transition hover:border-rose-400/30 hover:text-rose-500 dark:border-white/10 dark:text-slate-400"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 px-2 text-[10px] text-slate-400 dark:text-slate-500">
            <ShieldCheck className="h-3 w-3 text-brand-500" />
            Health data is stored under your private member code only
          </div>
        </div>
      </aside>

      {/* ----------------------------- Mobile header ---------------------------- */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#070b14]/80 lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Logo size="sm" to="/dashboard" />
          <div className="flex items-center gap-2">
            {user?.biometricEnabled && (
              <button
                type="button"
                onClick={() => {
                  lock();
                  toast("App locked");
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
                aria-label="Lock app"
                title="Lock app"
              >
                <Fingerprint className="h-4 w-4" />
              </button>
            )}
            <ThemeToggle />
            <NavLink
              to="/profile"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400/25 to-cyan-400/20 text-[11px] font-semibold text-brand-700 dark:text-brand-200"
              aria-label="Your profile"
            >
              {user ? initials(user.email) : "AF"}
            </NavLink>
          </div>
        </div>
      </header>

      <main className="lg:pl-72">
        <div className="page-shell">
          <Outlet />
        </div>
      </main>

      {/* ----------------------------- Mobile bottom nav ------------------------ */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 px-2 pt-1.5 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#070b14]/90 lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-medium transition",
                  isActive
                    ? "text-brand-600 dark:text-brand-300"
                    : "text-slate-400 dark:text-slate-500",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "flex h-8 w-12 items-center justify-center rounded-xl transition",
                      isActive && "bg-brand-500/10 dark:bg-brand-400/10",
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <BiometricLock />
    </div>
  );
}

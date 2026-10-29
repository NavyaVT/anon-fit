import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
  ScrollText,
  ShieldCheck,
  ShieldHalf,
  Terminal,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { logoutSession } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

const navigation = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Members", icon: Users },
  { to: "/admin/audit", label: "Audit trail", icon: ScrollText },
  { to: "/admin/logs", label: "Activity log", icon: Terminal },
];

export default function AdminLayout() {
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      if (refreshToken) await logoutSession(refreshToken);
    } catch {
      // Always clear locally.
    } finally {
      clearSession();
      navigate("/admin/login", { replace: true });
      toast.success("Admin signed out");
    }
  }

  return (
    <div className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-32 top-0 h-96 w-96 rounded-full bg-amber-500/[0.07] blur-3xl" />
        <div className="absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-violet-500/[0.07] blur-3xl" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-200/80 bg-white/70 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#080d18]/80 lg:flex">
        <div className="px-6 pb-2 pt-7">
          <Logo />
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            <ShieldHalf className="h-3 w-3" />
            Admin console
          </div>
        </div>

        <nav className="mt-6 flex-1 space-y-1.5 px-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            Governance
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
                    ? "bg-amber-500/[0.09] text-amber-800 dark:bg-amber-400/[0.1] dark:text-amber-200"
                    : "text-slate-500 hover:bg-slate-900/[0.035] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-white",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-amber-400 to-orange-400" />
                  )}
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] transition",
                      isActive
                        ? "text-amber-600 dark:text-amber-300"
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
          <div className="rounded-3xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-300" />
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  Members stay private
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  You see health numbers by member code. Names, emails and passwords
                  are never shown in the admin area.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-amber-500/10 pt-3">
              <span className="truncate text-[10px] font-semibold text-amber-700/80 dark:text-amber-200/70">
                Signed in as admin
              </span>
              <ThemeToggle className="h-8 w-8" />
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-2.5 text-xs font-medium text-slate-500 transition hover:border-rose-400/30 hover:text-rose-500 dark:border-white/10 dark:text-slate-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out of admin
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#070b14]/80 lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <Logo size="sm" to="/admin" />
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="lg:pl-72">
        <div className="page-shell">
          <Outlet />
        </div>
      </main>

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
                    ? "text-amber-600 dark:text-amber-300"
                    : "text-slate-400 dark:text-slate-500",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "flex h-8 w-12 items-center justify-center rounded-xl transition",
                      isActive && "bg-amber-500/10 dark:bg-amber-400/10",
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
    </div>
  );
}

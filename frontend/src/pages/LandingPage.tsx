import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Check,
  Database,
  Dumbbell,
  Fingerprint,
  Flame,
  KeyRound,
  Link2,
  LockKeyhole,
  Moon,
  Play,
  ShieldCheck,
  ShieldHalf,
  Smartphone,
  Sparkles,
  Split,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuthStore } from "@/stores/authStore";

const features = [
  {
    icon: Dumbbell,
    title: "YouTube workout plans",
    text: "Paste any YouTube link, add exercise timecodes and tick each move off as you train.",
    tone: "text-brand-500 bg-brand-500/10",
  },
  {
    icon: Split,
    title: "Split-data privacy",
    text: "Your identity and your health numbers are never stored together, so there is no single place holding both.",
    tone: "text-cyan-500 bg-cyan-500/10",
  },
  {
    icon: Fingerprint,
    title: "Biometric-style lock",
    text: "Enable the fingerprint gate and re-verify on every fresh app session.",
    tone: "text-violet-500 bg-violet-500/10",
  },
  {
    icon: Moon,
    title: "Sleep, screen & water",
    text: "A 30-second daily check-in for the habits that shape how you feel.",
    tone: "text-indigo-500 bg-indigo-500/10",
  },
  {
    icon: Flame,
    title: "Streaks that stick",
    text: "Consecutive workout days are calculated from check-ins, not estimates.",
    tone: "text-orange-500 bg-orange-500/10",
  },
  {
    icon: Users,
    title: "Private admin view",
    text: "Admins see anonymous member codes and health trends — never your email, name or phone number.",
    tone: "text-amber-500 bg-amber-500/10",
  },
];

const accountRows = [
  { field: "Your email", value: "Sign-in only" },
  { field: "Your password", value: "Stored scrambled" },
  { field: "Your role", value: "Member" },
  { field: "Account status", value: "Active" },
  { field: "Private member code", value: "Member 9C2E", highlight: true },
];

const healthRows = [
  { field: "Private member code", value: "Member 9C2E", highlight: true },
  { field: "Check-in date", value: "20 Oct" },
  { field: "Water glasses", value: "6" },
  { field: "Screen time", value: "4.5 h" },
  { field: "Sleep", value: "7.5 h" },
  { field: "Workout", value: "Completed" },
];

const lifecycle = [
  {
    icon: UserPlus,
    step: "01",
    title: "Enrolment",
    text: "Sign up with an email and password. A permanent private member code is created for your health data.",
  },
  {
    icon: KeyRound,
    step: "02",
    title: "Sign-in",
    text: "Your password is checked without ever being stored readable, and you stay signed in with a secure session.",
  },
  {
    icon: ShieldCheck,
    step: "03",
    title: "Access checks",
    text: "Your account status is re-checked on every request, so a paused account stops working immediately.",
  },
  {
    icon: Fingerprint,
    step: "04",
    title: "Extra lock",
    text: "A fingerprint or face-unlock gate can protect each fresh app session.",
  },
  {
    icon: ShieldHalf,
    step: "05",
    title: "Care & control",
    text: "Admins can pause or restore accounts. Pausing signs a member out everywhere.",
  },
  {
    icon: UserX,
    step: "06",
    title: "Leaving",
    text: "Deleting an account ends access for good, while anonymous health totals keep their value.",
  },
];

export default function LandingPage() {
  const user = useAuthStore((state) => state.user);
  const dashboardPath = user?.role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="relative overflow-hidden">
      {/* ------------------------------- Header -------------------------------- */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-[#f4f7f9]/80 backdrop-blur-xl dark:border-white/[0.05] dark:bg-[#070b14]/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-500 dark:text-slate-400 md:flex">
            <a href="#features" className="transition hover:text-slate-900 dark:hover:text-white">
              Features
            </a>
            <a href="#privacy" className="transition hover:text-slate-900 dark:hover:text-white">
              Privacy
            </a>
            <a href="#lifecycle" className="transition hover:text-slate-900 dark:hover:text-white">
              Lifecycle
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Link
                to={dashboardPath}
                className="btn-primary !px-4 !py-2.5 text-xs sm:!px-5 sm:text-sm"
              >
                Open app
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white sm:inline-flex"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="btn-primary !px-3.5 !py-2.5 text-xs sm:!px-5 sm:text-sm"
                >
                  Get started
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* -------------------------------- Hero --------------------------------- */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute right-0 top-0 h-[550px] w-[550px] rounded-full bg-brand-500/10 blur-3xl" />
          <div className="absolute -left-40 top-40 h-[400px] w-[400px] rounded-full bg-cyan-500/[0.07] blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700 dark:border-brand-400/20 dark:text-brand-300">
              <Sparkles className="h-3.5 w-3.5" />
              Privacy-first IAM demo
            </span>

            <h1 className="mt-5 font-display text-[2.65rem] font-semibold leading-[1.03] tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:text-[4.15rem]">
              Your health.
              <br />
              <span className="gradient-text">Your data.</span>
              <br />
              Your rules.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg">
              AnonFit is a full wellness companion — workouts, hydration, sleep and
              screen time — built on a complete identity and access management
              lifecycle. Admins see trends, never people.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to={user ? dashboardPath : "/register"}
                className="btn-primary w-full !py-3.5 sm:w-auto"
              >
                {user ? "Open your dashboard" : "Create your private account"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/admin/login" className="btn-secondary w-full !py-3.5 sm:w-auto">
                <ShieldHalf className="h-4 w-4" />
                Admin console
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {["No personal details in health data", "You stay in control", "Admins see only member codes"].map(
                (item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-300">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          {/* Phone mock-up */}
          <div className="relative mx-auto mt-14 w-full max-w-[350px] animate-fade-up [animation-delay:180ms] lg:mt-0">
            <div className="absolute left-1/2 top-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-400/15 blur-3xl" />

            <div className="relative rounded-[2.7rem] border border-white/10 bg-[#0a101c] p-2 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)]">
              <div className="rounded-[2.2rem] border border-white/[0.06] bg-gradient-to-b from-[#0d1727] to-[#070b14] p-4 pt-2.5 text-white">
                <div className="flex items-center justify-between text-[9px] text-slate-500">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                    <span className="h-2 w-3.5 rounded-[3px] border border-slate-600" />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400">Good morning</p>
                    <p className="font-display text-sm font-semibold">Your private day</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-400/30 to-cyan-400/20 text-[9px] font-semibold text-brand-200">
                    AN
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Today&apos;s workout
                      </p>
                      <p className="mt-0.5 text-xs font-medium">Full body mobility</p>
                    </div>
                    <span className="rounded-full bg-brand-400/15 px-2 py-0.5 text-[9px] font-semibold text-brand-300">
                      3 / 5
                    </span>
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-brand-400 to-cyan-400" />
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {[
                      { name: "Neck & shoulder release", time: "0:00", done: true },
                      { name: "Hip openers", time: "4:20", done: true },
                      { name: "Core flow", time: "9:10", done: true },
                    ].map((exercise) => (
                      <div key={exercise.name} className="flex items-center gap-2 text-[9px]">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-400 text-slate-950">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                        <span className="flex-1 truncate text-slate-300">{exercise.name}</span>
                        <span className="font-mono text-[8px] text-slate-500">{exercise.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">
                    <p className="text-[8px] uppercase tracking-wider text-slate-500">Water</p>
                    <p className="mt-0.5 font-display text-sm font-semibold">6 / 8</p>
                    <div className="mt-1.5 flex gap-0.5">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <span
                          key={index}
                          className={`h-1.5 flex-1 rounded-full ${
                            index < 6 ? "bg-cyan-400" : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">
                    <p className="text-[8px] uppercase tracking-wider text-slate-500">Sleep</p>
                    <p className="mt-0.5 font-display text-sm font-semibold">7h 30m</p>
                    <p className="mt-1.5 text-[8px] text-brand-300">On target</p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                  <Fingerprint className="h-4 w-4 text-brand-300" />
                  <div className="flex-1">
                    <p className="text-[9px] font-medium text-slate-200">Fingerprint lock</p>
                    <p className="text-[8px] text-slate-500">Enabled · mock sensor</p>
                  </div>
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                </div>

                <div className="mt-3 flex items-center justify-around border-t border-white/[0.06] pt-2.5 text-slate-600">
                  {[BarChart3, Dumbbell, Smartphone, Users].map((Icon, index) => (
                    <div
                      key={index}
                      className={`flex h-7 w-9 items-center justify-center rounded-lg ${
                        index === 0 ? "bg-brand-400/10 text-brand-300" : ""
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute -left-8 top-28 hidden animate-float items-center gap-2 rounded-2xl border border-white/10 bg-[#0b1220]/95 px-3 py-2 text-white shadow-xl backdrop-blur sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-400/15 text-brand-300">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[8px] uppercase tracking-wider text-slate-500">Admin sees</p>
                <p className="text-[9px] font-semibold text-brand-200">Member 9C2E</p>
              </div>
            </div>

            <div className="absolute -right-5 bottom-32 flex animate-float items-center gap-2 rounded-2xl border border-white/10 bg-[#0b1220]/95 px-3 py-2 text-white shadow-xl backdrop-blur [animation-delay:1.2s]">
              <Flame className="h-4 w-4 text-orange-400" />
              <div>
                <p className="font-display text-sm font-semibold leading-none">12</p>
                <p className="text-[8px] text-slate-500">day streak</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------- Stats --------------------------------- */}
      <section className="border-y border-slate-200/70 bg-white/40 dark:border-white/[0.05] dark:bg-white/[0.015]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-slate-200/60 dark:divide-white/[0.06] md:grid-cols-4">
          {[
            { value: "100%", label: "health records stored anonymously" },
            { value: "2", label: "separate stores for identity & health" },
            { value: "30 min", label: "before you re-sign-in" },
            { value: "0", label: "personal details admins can see" },
          ].map((stat) => (
            <div key={stat.label} className="px-5 py-5 text-center sm:py-6">
              <p className="font-display text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                {stat.value}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-500">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------ Features ------------------------------- */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">
            The complete loop
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            A wellness app that respects the person
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:text-base">
            Every feature works end-to-end — from the daily check-in to private
            account care and a tamper-aware audit trail.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="card card-pad card-hover group"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${feature.tone}`}>
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-base font-semibold text-slate-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {feature.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ------------------------------- Privacy ------------------------------- */}
      <section id="privacy" className="relative">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-12">
          <div className="rounded-[2.2rem] border border-slate-200/80 bg-white/60 p-5 shadow-soft dark:border-white/[0.07] dark:bg-white/[0.025] dark:shadow-none sm:p-8 lg:p-10">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/[0.07] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
                <Database className="h-3 w-3" />
                Privacy architecture
              </span>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Two separate stores. No way to link them back to you.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:text-base">
                AnonFit never puts your account details and your health numbers in the
                same place. Admin screens are built from the health side alone, so even
                a worst-case leak could not reveal whose record is whose.
              </p>
            </div>

            <div className="mt-8 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
              <div className="overflow-hidden rounded-3xl border border-violet-500/15 bg-violet-500/[0.035]">
                <div className="flex items-center gap-2.5 border-b border-violet-500/10 px-5 py-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 dark:text-violet-300">
                    <LockKeyhole className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      Your account
                    </p>
                    <p className="text-[10px] text-slate-500">Kept apart · never joined to health numbers</p>
                  </div>
                </div>
                <div className="space-y-1.5 p-4 font-mono text-[11px]">
                  {accountRows.map((row) => (
                    <div
                      key={row.field}
                      className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 ${
                        row.highlight
                          ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      <span>{row.field}</span>
                      <span className="truncate text-slate-700 dark:text-slate-300">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 py-1 lg:flex-col lg:py-0">
                <span className="hidden h-full w-px bg-gradient-to-b from-transparent via-brand-400/40 to-transparent lg:block" />
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-500/25 bg-brand-500/10 text-brand-500 shadow-glow-sm dark:text-brand-300">
                  <Link2 className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                  anon ID
                </span>
                <span className="hidden h-full w-px bg-gradient-to-b from-transparent via-brand-400/40 to-transparent lg:block" />
              </div>

              <div className="overflow-hidden rounded-3xl border border-brand-500/15 bg-brand-500/[0.035]">
                <div className="flex items-center gap-2.5 border-b border-brand-500/10 px-5 py-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 dark:text-brand-300">
                    <BarChart3 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      Your health log
                    </p>
                    <p className="text-[10px] text-slate-500">Anonymous numbers only · no name or email attached</p>
                  </div>
                </div>
                <div className="space-y-1.5 p-4 font-mono text-[11px]">
                  {healthRows.map((row) => (
                    <div
                      key={row.field}
                      className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 ${
                        row.highlight
                          ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      <span>{row.field}</span>
                      <span className="truncate text-slate-700 dark:text-slate-300">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                "Admin screens never show your email",
                "Your health numbers are stored under your private code",
                "Every admin action is logged under member codes",
                "Deleting an account keeps anonymous totals for trends",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 rounded-2xl border border-slate-200/70 bg-white/50 px-3.5 py-3 text-[11px] leading-relaxed text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-400"
                >
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500 dark:text-brand-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- Biometric gate ---------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 overflow-hidden rounded-[2.2rem] border border-slate-200/80 bg-white/50 p-6 dark:border-white/[0.07] dark:bg-white/[0.02] sm:p-10 lg:grid-cols-2 lg:p-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/[0.07] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
              <Fingerprint className="h-3 w-3" />
              Step-up protection
            </span>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              A second lock for a sensitive app.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:text-base">
              Health data is personal. When fingerprint lock is enabled, every fresh
              app session starts behind a biometric-style gate — even if the device is
              already signed in.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Re-locks on every app open, not just first login",
                "Demo sensor never captures or stores biometrics",
                "Password fallback always available",
                "Lock state is stored server-side per account",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/10 text-violet-500 dark:text-violet-300">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto flex h-72 w-full max-w-sm items-center justify-center overflow-hidden rounded-3xl border border-slate-200/70 bg-[#070b14] dark:border-white/[0.08]">
            <div
              className="absolute inset-0 opacity-80"
              style={{
                background:
                  "radial-gradient(400px 300px at 50% 20%, rgba(139,92,246,0.18), transparent 65%), radial-gradient(300px 250px at 80% 90%, rgba(16,185,129,0.14), transparent 65%)",
              }}
            />
            <div className="relative flex flex-col items-center">
              <div className="relative flex h-28 w-28 items-center justify-center">
                <span className="absolute inset-0 animate-pulse-ring rounded-full border border-violet-400/30" />
                <span className="absolute inset-3 animate-pulse-ring rounded-full border border-brand-400/20 [animation-delay:800ms]" />
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                  <Fingerprint className="h-11 w-11 text-violet-300" strokeWidth={1.3} />
                </div>
              </div>
              <p className="mt-5 font-display text-sm font-semibold text-white">
                Touch the sensor
              </p>
              <p className="mt-1 text-[10px] text-slate-500">Mock biometric · no data captured</p>
              <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-semibold text-slate-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
                Member 9C2E
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ Lifecycle ------------------------------ */}
      <section id="lifecycle" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">
            IAM lifecycle
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Identity, handled end-to-end
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:text-base">
            AnonFit demonstrates the full account journey — from first registration to
            audited offboarding.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lifecycle.map((phase) => (
            <div
              key={phase.step}
              className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/60 p-5 transition hover:border-brand-400/30 dark:border-white/[0.06] dark:bg-white/[0.02]"
            >
              <span className="absolute right-4 top-4 font-display text-2xl font-semibold text-slate-200/80 transition group-hover:text-brand-300/50 dark:text-white/[0.06] dark:group-hover:text-brand-400/20">
                {phase.step}
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
                <phase.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-sm font-semibold text-slate-900 dark:text-white">
                {phase.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {phase.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------- CTA --------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="relative overflow-hidden rounded-[2.2rem] border border-brand-500/20 bg-[#07111a] px-6 py-12 text-center sm:px-12 sm:py-16">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(600px 400px at 20% 0%, rgba(16,185,129,0.25), transparent 60%), radial-gradient(600px 400px at 90% 100%, rgba(14,165,233,0.18), transparent 60%)",
            }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-300">
              <Play className="h-3 w-3" />
              Start in under a minute
            </span>
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Take your health private.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
              Create an account, paste a YouTube workout, log your day, and watch your
              first streak begin — with your identity kept out of it all.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to={user ? dashboardPath : "/register"} className="btn-primary w-full !py-3.5 sm:w-auto">
                {user ? "Open AnonFit" : "Create your account"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="btn w-full border border-white/15 bg-white/[0.04] !py-3.5 text-white hover:bg-white/[0.08] sm:w-auto"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------- Footer ------------------------------- */}
      <footer className="border-t border-slate-200/70 dark:border-white/[0.05]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <Logo size="sm" />
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Privacy-first health & workout companion · IAM lifecycle demo
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Link to="/login" className="transition hover:text-slate-900 dark:hover:text-white">
              Sign in
            </Link>
            <Link to="/register" className="transition hover:text-slate-900 dark:hover:text-white">
              Register
            </Link>
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-1 transition hover:text-slate-900 dark:hover:text-white"
            >
              <ShieldHalf className="h-3.5 w-3.5" />
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

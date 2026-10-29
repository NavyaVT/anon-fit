import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Fingerprint, ShieldCheck, Split } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  accent?: "brand" | "amber";
}

const sideContent = {
  brand: {
    eyebrow: "Privacy-first health",
    headline: "Wellness without surveillance.",
    description:
      "Track workouts, hydration, sleep and screen time while your identity stays in a separate vault.",
    points: [
      {
        icon: Split,
        title: "Private by design",
        text: "Your health records are stored under a private member code, not your name.",
      },
      {
        icon: ShieldCheck,
        title: "Private admin view",
        text: "Administrators see aggregates, never personal details.",
      },
      {
        icon: Fingerprint,
        title: "Biometric-style lock",
        text: "A fingerprint gate protects every fresh session.",
      },
    ],
  },
  amber: {
    eyebrow: "Administrator access",
    headline: "Care without prying.",
    description:
      "Review wellness trends, manage accounts and keep a complete audit trail — without ever seeing a member's personal details.",
    points: [
      {
        icon: ShieldCheck,
        title: "Private by design",
        text: "Only member codes, health numbers and account status are shown.",
      },
      {
        icon: Split,
        title: "No personal details",
        text: "Names, emails and passwords stay out of every admin screen.",
      },
      {
        icon: Fingerprint,
        title: "Every action audited",
        text: "Sign-ins, pauses and deletions are recorded for review.",
      },
    ],
  },
};

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  accent = "brand",
}: AuthShellProps) {
  const content = sideContent[accent];
  const isAmber = accent === "amber";

  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand / story panel */}
      <aside
        className={cn(
          "relative hidden overflow-hidden border-r lg:flex lg:flex-col lg:justify-between lg:p-12",
          isAmber
            ? "border-amber-500/10 bg-[#0a0d14]"
            : "border-white/[0.06] bg-[#07111a]",
        )}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: isAmber
              ? "radial-gradient(700px 500px at 85% 0%, rgba(245,158,11,0.16), transparent 60%), radial-gradient(600px 500px at 0% 80%, rgba(139,92,246,0.12), transparent 60%)"
              : "radial-gradient(700px 500px at 85% 0%, rgba(16,185,129,0.18), transparent 60%), radial-gradient(600px 500px at 0% 80%, rgba(14,165,233,0.12), transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse at center, black, transparent 75%)",
          }}
        />

        <div className="relative">
          <Logo to="/" />
        </div>

        <div className="relative max-w-md">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
              isAmber
                ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                : "border-brand-400/20 bg-brand-400/10 text-brand-300",
            )}
          >
            {content.eyebrow}
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-white">
            {content.headline}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            {content.description}
          </p>

          <div className="mt-8 space-y-4">
            {content.points.map((point) => (
              <div key={point.title} className="flex items-start gap-3.5">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                    isAmber
                      ? "border-amber-400/15 bg-amber-400/[0.08] text-amber-300"
                      : "border-brand-400/15 bg-brand-400/[0.08] text-brand-300",
                  )}
                >
                  <point.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{point.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{point.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="text-[11px] leading-relaxed text-slate-400">
              “The admin dashboard sees a private member code and seven days of health
              numbers. That is all it can ever know about a person.”
            </p>
          </div>
        </div>

        <p className="relative text-[10px] uppercase tracking-[0.2em] text-slate-600">
          AnonFit · Privacy-first health tracking
        </p>
      </aside>

      {/* Form panel */}
      <main className="relative flex min-h-screen flex-col px-5 py-5 sm:px-8">
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <Logo size="sm" />
          </div>
          <Link
            to="/"
            className="hidden items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-white lg:inline-flex"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[420px] animate-fade-up">
            <div className="mb-7">
              {isAmber && (
                <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Restricted console
                </span>
              )}
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            </div>

            {children}

            {footer && <div className="mt-6">{footer}</div>}

            <p className="mt-8 text-center text-[10px] leading-relaxed text-slate-400 dark:text-slate-600">
              Your password is stored as an unreadable scramble, and you are signed out
              automatically after a period of inactivity.
              <br />
              AnonFit never sells or shares health data.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

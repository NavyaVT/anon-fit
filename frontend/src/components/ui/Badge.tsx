import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "brand" | "amber" | "rose" | "slate" | "violet" | "cyan";

const tones: Record<Tone, string> = {
  brand:
    "border-brand-500/20 bg-brand-500/10 text-brand-700 dark:border-brand-400/20 dark:text-brand-300",
  amber:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:text-amber-300",
  rose:
    "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:border-rose-400/20 dark:text-rose-300",
  slate:
    "border-slate-500/15 bg-slate-500/10 text-slate-600 dark:border-white/10 dark:text-slate-300",
  violet:
    "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:border-violet-400/20 dark:text-violet-300",
  cyan:
    "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:border-cyan-400/20 dark:text-cyan-300",
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}

export default function Badge({ tone = "slate", children, dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

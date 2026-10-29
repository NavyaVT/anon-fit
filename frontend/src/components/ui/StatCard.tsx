import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "brand" | "cyan" | "violet" | "amber" | "rose";
  className?: string;
}

const tones = {
  brand: "bg-brand-500/10 text-brand-600 dark:text-brand-300",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "brand",
  className,
}: StatCardProps) {
  return (
    <div className={cn("card card-pad card-hover", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        {hint && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
            {hint}
          </span>
        )}
      </div>
      <p className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

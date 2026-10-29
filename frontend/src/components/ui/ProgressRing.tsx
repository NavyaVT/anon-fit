import { useId, type ReactNode } from "react";
import { cn, percent } from "@/lib/utils";

interface ProgressRingProps {
  value: number;
  max: number;
  label: string;
  display?: ReactNode;
  size?: number;
  stroke?: number;
  from?: string;
  to?: string;
  className?: string;
}

export default function ProgressRing({
  value,
  max,
  label,
  display,
  size = 104,
  stroke = 8,
  from = "#34d399",
  to = "#0ea5e9",
  className,
}: ProgressRingProps) {
  const gradientId = `ring-${useId().replace(/:/g, "")}`;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = percent(value, max);
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={from} />
              <stop offset="100%" stopColor={to} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-slate-200/80 dark:stroke-white/[0.08]"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-xl font-semibold leading-none tracking-tight text-slate-900 dark:text-white">
            {display ?? `${progress}%`}
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

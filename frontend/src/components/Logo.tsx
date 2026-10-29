import { Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoProps {
  to?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

export default function Logo({
  to = "/",
  size = "md",
  showWordmark = true,
  className,
}: LogoProps) {
  const dimensions = {
    sm: { box: "h-8 w-8 rounded-xl", icon: "h-4 w-4", text: "text-base" },
    md: { box: "h-10 w-10 rounded-2xl", icon: "h-5 w-5", text: "text-lg" },
    lg: { box: "h-12 w-12 rounded-2xl", icon: "h-6 w-6", text: "text-xl" },
  }[size];

  const content = (
    <>
      <span
        className={cn(
          "relative flex items-center justify-center bg-gradient-to-br from-brand-400 via-emerald-400 to-cyan-400 text-slate-950 shadow-glow-sm",
          dimensions.box,
        )}
      >
        <Activity className={cn("relative z-10", dimensions.icon)} strokeWidth={2.5} />
        <span className="absolute inset-0 rounded-[inherit] bg-white/20 opacity-0 transition group-hover:opacity-100" />
      </span>
      {showWordmark && (
        <span className={cn("font-display font-semibold tracking-tight", dimensions.text)}>
          Anon<span className="text-brand-500 dark:text-brand-300">Fit</span>
          <span className="text-brand-400">.</span>
        </span>
      )}
    </>
  );

  return (
    <Link
      to={to}
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="AnonFit home"
    >
      {content}
    </Link>
  );
}

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-brand-500", className)} />;
}

export function PageLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-400/20 bg-brand-500/10">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
        <span className="absolute inset-0 animate-ping rounded-2xl border border-brand-400/20" />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export function FullPageLoader({ label = "Securing your session..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#f4f7f9] dark:bg-[#070b14]">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-brand-400 to-cyan-400 text-slate-950 shadow-glow">
        <Loader2 className="h-7 w-7 animate-spin" />
        <span className="absolute -inset-3 animate-pulse-ring rounded-[1.8rem] border border-brand-400/30" />
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

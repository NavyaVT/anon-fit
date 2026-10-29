import { Check, Copy, ShieldCheck } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { cn, memberLabel } from "@/lib/utils";

interface AnonIdChipProps {
  anonymizedId: string;
  className?: string;
  showCopy?: boolean;
}

/**
 * Shows the member's private reference as a short code ("Member 9C2E").
 * The full value stays available for copying, but the raw reference is never
 * spelled out on screen.
 */
export default function AnonIdChip({
  anonymizedId,
  className,
  showCopy = true,
}: AnonIdChipProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(anonymizedId);
      setCopied(true);
      toast.success("Private ID copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-brand-500/20 bg-brand-500/[0.07] py-1 pl-2.5 pr-1 text-xs font-medium text-brand-700 dark:border-brand-400/20 dark:text-brand-300",
        className,
      )}
      title="The private code used for your health data — never your name or email"
    >
      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
      <span className="text-[11px] font-semibold tracking-tight">
        {memberLabel(anonymizedId)}
      </span>
      {showCopy && (
        <button
          type="button"
          onClick={copy}
          className="rounded-full p-1.5 text-brand-600/70 transition hover:bg-brand-500/10 hover:text-brand-700 dark:text-brand-300/70 dark:hover:text-brand-200"
          aria-label="Copy private ID"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      )}
    </span>
  );
}

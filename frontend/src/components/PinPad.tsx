import { useEffect, useRef, useState } from "react";
import { Delete, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PinPadProps {
  /** Called once four digits are entered; resolves via `verifying`. */
  onSubmit: (pin: string) => void;
  /** True while the PIN is being checked — the pad shows a spinner. */
  verifying: boolean;
  /** Shake + clear when this increments (a wrong PIN). */
  errorNonce?: number;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

/**
 * 4-digit PIN entry for the privacy lock. Digits fill dots as typed; the PIN
 * is submitted automatically at four digits and never leaves this component
 * in any persisted form.
 */
export default function PinPad({ onSubmit, verifying, errorNonce = 0 }: PinPadProps) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (errorNonce > 0) {
      setPin("");
      submittingRef.current = false;
      setShake(true);
      const timer = window.setTimeout(() => setShake(false), 450);
      return () => window.clearTimeout(timer);
    }
  }, [errorNonce]);

  function press(key: string) {
    if (verifying || submittingRef.current) return;
    if (key === "del") {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (!key || !/^\d$/.test(key)) return;
    setPin((prev) => {
      const next = (prev + key).slice(0, 4);
      if (next.length === 4) {
        submittingRef.current = true;
        // Defer so the fourth dot paints before the network call.
        window.setTimeout(() => onSubmit(next), 120);
      }
      return next;
    });
  }

  return (
    <div className={cn("mx-auto w-full max-w-[260px]", shake && "animate-shake")}>
      <div className="flex justify-center gap-3.5" aria-label="PIN entry">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              "h-3.5 w-3.5 rounded-full border transition duration-200",
              verifying
                ? "animate-pulse border-brand-400 bg-brand-400/60"
                : pin.length > index
                  ? "scale-110 border-brand-400 bg-brand-400"
                  : "border-slate-500/60 bg-transparent",
            )}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2.5">
        {KEYS.map((key, index) =>
          key === "" ? (
            <span key={`spacer-${index}`} />
          ) : (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              disabled={verifying}
              aria-label={key === "del" ? "Delete last digit" : `Digit ${key}`}
              className={cn(
                "flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 text-lg font-semibold text-slate-100 transition",
                "hover:border-white/20 hover:bg-white/[0.08] active:scale-95",
                "disabled:opacity-40",
                key === "del" && "text-slate-400",
              )}
            >
              {verifying && key === "del" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : key === "del" ? (
                <Delete className="h-5 w-5" />
              ) : (
                key
              )}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Fingerprint,
  Loader2,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import toast from "react-hot-toast";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { startAuthentication } from "@simplewebauthn/browser";
import { logoutSession } from "@/api/auth";
import { getErrorMessage } from "@/api/client";
import { unlockWithPin } from "@/api/pin";
import { beginPasskeyUnlock, finishPasskeyUnlock } from "@/api/webauthn";
import PinPad from "@/components/PinPad";
import {
  describePasskeyError,
  isPasskeyCancellation,
  isPasskeyError,
} from "@/lib/webauthn";
import { useAuthStore } from "@/stores/authStore";
import Logo from "./Logo";
import { cn, memberLabel } from "@/lib/utils";

type Phase = "idle" | "scanning" | "success";
/** Which unlock method the member chose — both stay available. */
type Mode = "biometric" | "pin";

export default function BiometricLock() {
  const locked = useAuthStore((state) => state.locked);
  const user = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const unlock = useAuthStore((state) => state.unlock);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("biometric");
  const [error, setError] = useState<string | null>(null);
  const [challengeReady, setChallengeReady] = useState(false);
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [pinErrorNonce, setPinErrorNonce] = useState(0);
  const optionsRef = useRef<PublicKeyCredentialRequestOptionsJSON | null>(null);

  const hasPasskey = Boolean(user?.biometricEnabled);
  const hasPin = Boolean(user?.pinEnabled);

  // Default to whichever method this account actually has; PIN first when
  // there is no fingerprint, fingerprint first when there is one.
  useEffect(() => {
    if (!locked) {
      setPhase("idle");
      setError(null);
      setChallengeReady(false);
      setVerifyingPin(false);
      optionsRef.current = null;
      setMode(user?.biometricEnabled ? "biometric" : "pin");
      return;
    }
    setMode(user?.biometricEnabled ? "biometric" : hasPin ? "pin" : "biometric");
    // Only the initial mount should pick the default; later user switches
    // use the toggle buttons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  // Ask for a fresh challenge as soon as the gate appears, so the OS prompt
  // opens straight from the tap rather than after a network round trip.
  useEffect(() => {
    if (!locked || mode !== "biometric" || !hasPasskey) return;

    let alive = true;
    void beginPasskeyUnlock()
      .then((options) => {
        if (!alive) return;
        optionsRef.current = options;
        setChallengeReady(true);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(getErrorMessage(err, "No fingerprint is enrolled for this account."));
      });

    return () => {
      alive = false;
    };
  }, [locked, mode, hasPasskey]);

  useEffect(() => {
    if (phase !== "success") return;
    const timer = window.setTimeout(() => {
      unlock();
      toast.success("Unlocked — welcome back", { icon: "👋" });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [phase, unlock]);

  async function scan() {
    if (phase !== "idle" || mode !== "biometric") return;
    setError(null);
    setPhase("scanning");

    try {
      const options = optionsRef.current ?? (await beginPasskeyUnlock());
      optionsRef.current = options;
      const credential = await startAuthentication({ optionsJSON: options });
      await finishPasskeyUnlock(credential);
      setPhase("success");
    } catch (err) {
      optionsRef.current = null;
      setPhase("idle");
      if (isPasskeyCancellation(err)) {
        setError("Fingerprint not recognised, or the prompt was dismissed.");
      } else if (isPasskeyError(err)) {
        setError(describePasskeyError(err));
      } else {
        setError(getErrorMessage(err, "Could not verify your fingerprint."));
      }
      // The challenge was consumed by the attempt; fetch a fresh one.
      void beginPasskeyUnlock()
        .then((next) => {
          optionsRef.current = next;
        })
        .catch(() => undefined);
    }
  }

  async function submitPin(pin: string) {
    if (phase !== "idle" || mode !== "pin") return;
    setError(null);
    setVerifyingPin(true);
    try {
      await unlockWithPin(pin);
      setPhase("success");
    } catch (err) {
      setPinErrorNonce((nonce) => nonce + 1);
      setError(getErrorMessage(err, "Wrong PIN. Try again."));
    } finally {
      setVerifyingPin(false);
    }
  }

  function switchMode(next: Mode) {
    if (phase !== "idle" || next === mode) return;
    setMode(next);
    setError(null);
  }

  async function usePasswordInstead() {
    try {
      if (refreshToken) await logoutSession(refreshToken);
    } catch {
      // Signing out locally must succeed even if the API is unreachable.
    } finally {
      clearSession();
      navigate("/login", { replace: true });
    }
  }

  if (!locked || !user) return null;

  const biometricActive = mode === "biometric";
  const showBiometricButton = biometricActive || !hasPin;
  const showPinToggle = hasPin && biometricActive && hasPasskey;
  const showBiometricToggle = hasPasskey && !biometricActive && hasPin;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#050810] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(700px 500px at 50% 10%, rgba(16,185,129,0.18), transparent 60%), radial-gradient(600px 500px at 90% 90%, rgba(14,165,233,0.12), transparent 60%), radial-gradient(500px 400px at 10% 80%, rgba(99,102,241,0.12), transparent 60%)",
        }}
      />
      <div className="relative flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7">
        <Logo to="/" size="sm" />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-300">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
          Privacy lock
        </span>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-10">
        <div className="w-full max-w-sm text-center">
          {showBiometricButton ? (
            <>
              <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
                <span className="absolute inset-0 animate-pulse-ring rounded-full border border-brand-400/25" />
                <span className="absolute inset-4 animate-pulse-ring rounded-full border border-cyan-400/20 [animation-delay:700ms]" />
                <div
                  className={cn(
                    "relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border transition duration-500",
                    phase === "success"
                      ? "border-brand-400/60 bg-brand-400/15 shadow-glow"
                      : "border-white/10 bg-white/[0.04]",
                  )}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/[0.06] to-transparent" />
                  {phase === "success" ? (
                    <Check className="h-14 w-14 text-brand-300" strokeWidth={1.6} />
                  ) : (
                    <Fingerprint
                      className={cn(
                        "h-16 w-16 transition duration-500",
                        phase === "scanning" ? "text-brand-300" : "text-slate-400",
                      )}
                      strokeWidth={1.25}
                    />
                  )}
                  {phase === "scanning" && (
                    <>
                      <span className="absolute left-6 right-6 h-px animate-scan bg-gradient-to-r from-transparent via-brand-300 to-transparent shadow-[0_0_12px_2px_rgba(52,211,153,0.6)]" />
                      <span className="absolute inset-0 animate-pulse bg-brand-400/5" />
                    </>
                  )}
                </div>
              </div>

              <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">
                {phase === "success"
                  ? "Identity verified"
                  : phase === "scanning"
                    ? "Waiting for your fingerprint..."
                    : "Welcome back"}
              </h1>
              <p className="mt-1.5 text-sm text-slate-400">
                {phase === "success"
                  ? "Opening your private dashboard"
                  : "Confirm your fingerprint, face or device PIN to unlock AnonFit"}
              </p>
            </>
          ) : (
            <>
              <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
                <span className="absolute inset-0 animate-pulse-ring rounded-full border border-brand-400/25" />
                <span className="absolute inset-4 animate-pulse-ring rounded-full border border-cyan-400/20 [animation-delay:700ms]" />
                <div
                  className={cn(
                    "relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border transition duration-500",
                    phase === "success"
                      ? "border-brand-400/60 bg-brand-400/15 shadow-glow"
                      : "border-white/10 bg-white/[0.04]",
                  )}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/[0.06] to-transparent" />
                  {phase === "success" ? (
                    <Check className="h-14 w-14 text-brand-300" strokeWidth={1.6} />
                  ) : (
                    <LockKeyhole
                      className="h-14 w-14 text-slate-400 transition duration-500"
                      strokeWidth={1.25}
                    />
                  )}
                </div>
              </div>

              <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">
                {phase === "success" ? "Identity verified" : "Welcome back"}
              </h1>
              <p className="mt-1.5 text-sm text-slate-400">
                {phase === "success"
                  ? "Opening your private dashboard"
                  : "Enter your 4-digit PIN to unlock AnonFit"}
              </p>
            </>
          )}

          <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300">
            <LockKeyhole className="h-3.5 w-3.5 text-brand-400" />
            <span>{memberLabel(user.anonymizedId)}</span>
          </div>

          {error && (
            <div className="mx-auto mt-4 flex max-w-[320px] items-start gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3.5 py-2.5 text-left text-[11px] leading-relaxed text-rose-200">
              <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!biometricActive && hasPin ? (
            <div className="mt-6">
              <PinPad
                onSubmit={(pin) => void submitPin(pin)}
                verifying={verifyingPin}
                errorNonce={pinErrorNonce}
              />
              {phase === "success" && (
                <p className="mt-3 text-xs font-medium text-brand-300">PIN correct</p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void scan()}
              disabled={phase !== "idle"}
              className={cn(
                "btn mt-8 w-full rounded-2xl py-3.5 text-sm font-semibold transition",
                phase === "success"
                  ? "bg-brand-400 text-slate-950"
                  : "bg-gradient-to-r from-brand-500 to-emerald-400 text-slate-950 shadow-glow hover:from-brand-400 hover:to-emerald-300",
              )}
            >
              {phase === "scanning" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying fingerprint...
                </>
              ) : phase === "success" ? (
                <>
                  <Check className="h-4 w-4" /> Unlocked
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4" /> Touch fingerprint sensor
                </>
              )}
            </button>
          )}

          {biometricActive && !challengeReady && !error && phase !== "success" && (
            <p className="mt-2 text-[10px] text-slate-500">Preparing the sensor...</p>
          )}

          {(showPinToggle || showBiometricToggle) && phase !== "success" && (
            <button
              type="button"
              onClick={() => switchMode(biometricActive ? "pin" : "biometric")}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-medium text-slate-400 transition hover:text-white"
            >
              {biometricActive ? (
                <>
                  <LockKeyhole className="h-3.5 w-3.5" /> Use PIN instead
                </>
              ) : (
                <>
                  <Fingerprint className="h-3.5 w-3.5" /> Use fingerprint instead
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={usePasswordInstead}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-medium text-slate-400 transition hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Use password instead
          </button>

          <p className="mx-auto mt-8 max-w-[300px] text-[11px] leading-relaxed text-slate-500">
            Your fingerprint never leaves this device. AnonFit verifies a signed,
            single-use challenge against the passkey enrolled here — no biometric data
            is transmitted or stored. Your PIN is stored only as a one-way hash.
          </p>
        </div>
      </div>
    </div>
  );
}

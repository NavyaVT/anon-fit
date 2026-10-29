import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Fingerprint, Mail, ShieldHalf } from "lucide-react";
import toast from "react-hot-toast";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { startAuthentication } from "@simplewebauthn/browser";
import { loginUser } from "@/api/auth";
import { getErrorMessage } from "@/api/client";
import { beginPasskeyLogin, finishPasskeyLogin } from "@/api/webauthn";
import AuthShell from "@/components/auth/AuthShell";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import {
  describePasskeyError,
  isPasskeyCancellation,
  isPasskeyError,
  markPasskeyDevice,
  passkeysSupported,
} from "@/lib/webauthn";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPage() {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [passkeyReady, setPasskeyReady] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyOptions, setPasskeyOptions] =
    useState<PublicKeyCredentialRequestOptionsJSON | null>(null);

  const from = (location.state as { from?: string } | null)?.from;
  const destination = from && from.startsWith("/") ? from : "/dashboard";

  // Check support and pre-fetch a challenge, so tapping the button opens the
  // OS prompt immediately instead of after a network round trip.
  useEffect(() => {
    let alive = true;

    void (async () => {
      if (!(await passkeysSupported())) return;
      if (!alive) return;
      setPasskeyReady(true);
      try {
        const options = await beginPasskeyLogin();
        if (alive) setPasskeyOptions(options);
      } catch {
        // The button retries on demand.
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function refreshPasskeyChallenge() {
    try {
      setPasskeyOptions(await beginPasskeyLogin());
    } catch {
      setPasskeyOptions(null);
    }
  }

  if (user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const auth = await loginUser(email.trim(), password);
      setAuth(auth);
      toast.success("Welcome back to AnonFit");
      navigate(destination, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to sign in"));
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeySignIn() {
    setError(null);
    setPasskeyLoading(true);
    try {
      const options = passkeyOptions ?? (await beginPasskeyLogin());
      const credential = await startAuthentication({ optionsJSON: options });
      const auth = await finishPasskeyLogin(credential);
      markPasskeyDevice();
      setPasskeyOptions(null);
      setAuth(auth);
      toast.success("Signed in with your fingerprint", { icon: "🔐" });
      navigate(destination, { replace: true });
    } catch (err) {
      setPasskeyOptions(null);
      if (isPasskeyCancellation(err)) {
        setError(
          "Fingerprint check was cancelled. If this device has no passkey, sign in with your password.",
        );
      } else if (isPasskeyError(err)) {
        setError(describePasskeyError(err));
      } else {
        setError(getErrorMessage(err, "Fingerprint sign-in failed"));
      }
      void refreshPasskeyChallenge();
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your private wellness routine."
      footer={
        <div className="flex flex-col items-center gap-3 text-center text-sm">
          <p className="text-slate-500 dark:text-slate-400">
            New to AnonFit?{" "}
            <Link
              to="/register"
              className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-300"
            >
              Create an account
            </Link>
          </p>
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
          >
            <ShieldHalf className="h-3.5 w-3.5" />
            Administrator? Open the admin console
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          leftIcon={<Mail className="h-4 w-4" />}
          required
        />

        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint="3 wrong attempts block the account for 15 minutes."
          required
        />

        <Button
          type="submit"
          loading={loading}
          disabled={passkeyLoading}
          className="w-full"
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Sign in
        </Button>
      </form>

      {passkeyReady && (
        <>
          <div className="my-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            or
            <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            loading={passkeyLoading}
            disabled={loading}
            onClick={() => void handlePasskeySignIn()}
            leftIcon={<Fingerprint className="h-4 w-4 text-violet-500 dark:text-violet-300" />}
          >
            Sign in with fingerprint
          </Button>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
            Uses the fingerprint, face or device PIN already set up on this device. Your
            password still works as a fallback.
          </p>
        </>
      )}

      <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white/50 px-4 py-3 text-[11px] text-slate-500 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
        Health data stays linked to an anonymous ID — never your email.
      </div>
    </AuthShell>
  );
}

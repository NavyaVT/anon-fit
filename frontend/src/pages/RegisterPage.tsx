import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Check, Mail, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { registerUser } from "@/api/auth";
import { getErrorMessage } from "@/api/client";
import AuthShell from "@/components/auth/AuthShell";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import { cn, passwordChecks } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

export default function RegisterPage() {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  const checks = passwordChecks(password);
  const allChecksPass = checks.every((check) => check.ok);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    if (!allChecksPass) {
      setError("Your password does not meet the requirements yet.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const auth = await registerUser(email.trim(), password);
      setAuth(auth);
      toast.success("Account created — your private member code is ready", {
        duration: 4000,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create your account"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your private account"
      subtitle="No name, no phone number — just an email to sign in. A permanent private member code is created for your health data."
      footer={
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-300"
          >
            Sign in
          </Link>
        </p>
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
          autoComplete="new-password"
          placeholder="Create a strong password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {checks.map((check) => (
            <div
              key={check.label}
              className={cn(
                "flex items-center gap-1.5 text-[11px] transition",
                check.ok
                  ? "text-brand-600 dark:text-brand-300"
                  : "text-slate-400 dark:text-slate-500",
              )}
            >
              <span
                className={cn(
                  "flex h-3.5 w-3.5 items-center justify-center rounded-full border",
                  check.ok
                    ? "border-brand-400 bg-brand-500/15"
                    : "border-slate-300 dark:border-white/15",
                )}
              >
                {check.ok && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </span>
              {check.label}
            </div>
          ))}
        </div>

        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={
            confirm && password !== confirm ? "Passwords do not match" : undefined
          }
          required
        />

        <Button
          type="submit"
          loading={loading}
          className="w-full"
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Create private account
        </Button>
      </form>

      <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-brand-500/15 bg-brand-500/[0.05] px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-500 dark:text-brand-300" />
        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          When you sign up you receive a permanent private member code, such as{" "}
          <span className="font-semibold text-brand-700 dark:text-brand-300">Member 9C2E</span>
          . Every workout, glass of water and sleep log is stored under that code —
          never your identity.
        </p>
      </div>
    </AuthShell>
  );
}

import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Mail, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { loginAdmin } from "@/api/auth";
import { getErrorMessage } from "@/api/client";
import AuthShell from "@/components/auth/AuthShell";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import { useAuthStore } from "@/stores/authStore";

export default function AdminLoginPage() {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Enter your administrator email and password.");
      return;
    }

    setLoading(true);
    try {
      const auth = await loginAdmin(email.trim(), password);
      setAuth(auth);
      toast.success("Admin access granted");
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Administrator sign-in failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      accent="amber"
      title="Administrator sign-in"
      subtitle="Review wellness trends, manage accounts and keep the full audit trail — without seeing anyone's personal details."
      footer={
        <Link
          to="/login"
          className="text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
        >
          Not an administrator? Member sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/15 bg-amber-500/[0.05] px-4 py-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-300" />
          Administrator screens show member codes and health numbers only — never names,
          emails or passwords. Everything you do here is recorded in the audit trail.
        </div>

        {user && (
          <div className="rounded-2xl border border-slate-500/15 bg-slate-500/[0.06] px-4 py-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            You are signed in as a member. Signing in here replaces the current session
            with an administrator session.
          </div>
        )}

        <Input
          label="Admin email"
          type="email"
          autoComplete="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          leftIcon={<Mail className="h-4 w-4" />}
          required
        />

        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="Administrator password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint="3 wrong attempts block the account for 15 minutes."
          required
        />

        <Button
          type="submit"
          loading={loading}
          className="w-full !bg-gradient-to-r !from-amber-400 !to-orange-400 !text-slate-950 shadow-[0_0_30px_-12px_rgba(245,158,11,0.6)] hover:!from-amber-300 hover:!to-orange-300"
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Enter admin console
        </Button>
      </form>
    </AuthShell>
  );
}

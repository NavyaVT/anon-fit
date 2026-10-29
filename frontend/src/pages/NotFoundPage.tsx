import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import Logo from "@/components/Logo";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";

export default function NotFoundPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo size="md" />
      <div className="mt-10 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-500/10 text-brand-500 dark:text-brand-300">
        <Compass className="h-7 w-7" />
      </div>
      <p className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.25em] text-brand-500">
        404
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
        This path is off the map
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        The page you are looking for does not exist or has moved.
      </p>
      <div className="mt-7 flex flex-col gap-2 sm:flex-row">
        <Link to={user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/"}>
          <Button leftIcon={<ArrowLeft className="h-4 w-4" />}>
            {user ? "Back to dashboard" : "Back to home"}
          </Button>
        </Link>
        {!user && (
          <Link to="/login">
            <Button variant="secondary">Sign in</Button>
          </Link>
        )}
      </div>
    </div>
  );
}

import { useEffect, type ReactNode } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/client";
import { getMe } from "@/api/users";
import { useAuthStore } from "@/stores/authStore";

/**
 * Validates the persisted session against the API on a fresh app load.
 * A biometric lock, when enabled, is applied during store rehydration.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const hydrated = useAuthStore((state) => state.hydrated);
  const bootstrapped = useAuthStore((state) => state.bootstrapped);

  useEffect(() => {
    if (!hydrated || bootstrapped) return;

    const state = useAuthStore.getState();
    if (!state.accessToken || !state.user) {
      state.setBootstrapped(true);
      return;
    }

    let active = true;
    (async () => {
      try {
        const user = await getMe();
        if (!active) return;
        const store = useAuthStore.getState();
        store.updateUser(user);
        // Lock whenever the member has a way back in: fingerprint or PIN.
        if (
          user.role === "user" &&
          (user.biometricEnabled || user.pinEnabled)
        ) {
          store.lock();
        }
      } catch (error) {
        if (!active) return;
        useAuthStore.getState().clearSession();
        toast.error(getErrorMessage(error, "Your session has ended. Please sign in again."));
      } finally {
        if (active) useAuthStore.getState().setBootstrapped(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [hydrated, bootstrapped]);

  return <>{children}</>;
}

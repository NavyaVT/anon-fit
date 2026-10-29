import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isPasskeyDevice } from "@/lib/webauthn";
import type { AuthResponse, SessionPayload, User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** Zustand persist rehydration finished. */
  hydrated: boolean;
  /** Initial token validation against the API finished. */
  bootstrapped: boolean;
  /** Biometric gate currently shown. */
  locked: boolean;

  setAuth: (auth: AuthResponse) => void;
  setSession: (session: SessionPayload & { user: User }) => void;
  updateUser: (user: User) => void;
  clearSession: () => void;
  setHydrated: () => void;
  setBootstrapped: (value: boolean) => void;
  lock: () => void;
  unlock: () => void;
}

const persistKey = "anonfit-auth";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      bootstrapped: false,
      locked: false,

      setAuth: (auth) =>
        set({
          user: auth.user,
          accessToken: auth.accessToken,
          refreshToken: auth.refreshToken,
          locked: false,
          bootstrapped: true,
        }),

      setSession: (session) =>
        set({
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        }),

      updateUser: (user) => set((state) => ({ ...state, user })),

      clearSession: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          locked: false,
          bootstrapped: true,
        }),

      setHydrated: () =>
        set((state) => ({
          hydrated: true,
          // The gate re-arms on every fresh app load when the member has a
          // way to satisfy it: a passkey held by this device, or a PIN.
          locked: Boolean(
            state.user?.role === "user" &&
              ((state.user?.biometricEnabled && isPasskeyDevice()) ||
                state.user?.pinEnabled),
          ),
        })),

      setBootstrapped: (value) => set({ bootstrapped: value }),

      lock: () => set({ locked: true }),
      unlock: () => set({ locked: false }),
    }),
    {
      name: persistKey,
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      // Biometric lock is session-scoped: re-lock on every fresh app load.
      // Use the hydrated state's action rather than the store binding: with
      // synchronous storage this callback runs while the store is still being
      // created, so referencing `useAuthStore` here would throw.
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

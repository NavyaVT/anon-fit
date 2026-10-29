import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/authStore";
import type { AuthResponse } from "@/types";

export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

/* --------------------------- Request: bearer ---------------------------- */
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ------------------- Response: transparent refresh ---------------------- */
type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<AuthResponse> | null = null;

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return [
    "/auth/login",
    "/auth/admin/login",
    "/auth/register",
    "/auth/refresh",
    "/auth/logout",
  ].some((path) => url.includes(path));
}

async function refreshSession(): Promise<AuthResponse> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) throw new Error("No refresh token");

  // Bare axios: bypasses this interceptor to avoid recursion.
  const { data } = await axios.post<AuthResponse>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { "Content-Type": "application/json" }, timeout: 20_000 },
  );
  useAuthStore.getState().setSession(data);
  return data;
}

function expireSession(): void {
  const state = useAuthStore.getState();
  const hadSession = Boolean(state.user || state.accessToken);
  state.clearSession();
  if (hadSession) window.dispatchEvent(new Event("anonfit:session-expired"));
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry && !isAuthEndpoint(original.url)) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshSession().finally(() => {
            refreshPromise = null;
          });
        }
        const session = await refreshPromise;
        original.headers.Authorization = `Bearer ${session.accessToken}`;
        return api(original);
      } catch {
        expireSession();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

/** Friendly wording for status codes when the server sent no readable message. */
const STATUS_FALLBACKS: Record<number, string> = {
  400: "Please check the details you entered and try again.",
  401: "Your sign-in details are incorrect, or your session has expired.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  408: "That took too long to process. Please try again.",
  409: "That conflicts with something that already exists.",
  429: "Too many attempts — please wait a moment and try again.",
};

/** Gateway errors mean a hop between your device and AnonFit failed. */
const GATEWAY_FALLBACK =
  "AnonFit is having trouble connecting right now. Please try again in a moment.";

/** Convert FastAPI / network errors into a human-readable message. */
export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ERR_NETWORK" || error.code === "ECONNABORTED") {
      return "Cannot reach AnonFit right now. Check your connection and try again.";
    }
    const status = error.response?.status;
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const joined = detail
        .map((entry) => {
          if (entry && typeof entry === "object" && "msg" in entry) {
            return String((entry as { msg: unknown }).msg);
          }
          return String(entry);
        })
        .join(" • ");
      if (joined.trim()) return joined;
    }
    if (status != null) {
      if (status >= 500) return GATEWAY_FALLBACK;
      if (STATUS_FALLBACKS[status]) return STATUS_FALLBACKS[status];
    }
  }
  if (error instanceof Error && error.message) {
    // Never surface axios plumbing text like "Request failed with status code 502".
    if (/^Request failed with status code \d+$/.test(error.message)) return fallback;
    return error.message;
  }
  return fallback;
}

export default api;

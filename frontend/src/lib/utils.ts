import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

/** Tiny classname joiner — avoids an extra dependency. */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

/** Format seconds as MM:SS or H:MM:SS. */
export function formatTimecode(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Parse a user-entered timecode: "90", "1:30", "01:02:03".
 * Returns null when the value is not a valid timecode.
 */
export function parseTimecode(input: string): number | null {
  const value = input.trim();
  if (!value) return 0;
  if (!/^\d{1,2}(:\d{1,2}){0,2}$/.test(value)) return null;

  const parts = value.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return null;

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) {
    if (parts[1] > 59) return null;
    return parts[0] * 60 + parts[1];
  }
  if (parts[1] > 59 || parts[2] > 59) return null;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

/** Extract a YouTube video id from common URL shapes. */
export function getYouTubeId(rawUrl: string): string | null {
  if (!rawUrl.trim()) return null;
  try {
    const url = new URL(rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`);
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
    let id: string | null = null;

    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (/^\/(shorts|embed|live|v)\//.test(url.pathname)) {
        id = url.pathname.split("/").filter(Boolean)[1] ?? null;
      }
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function youtubeThumbnail(videoId: string | null): string | null {
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
}

export function youtubeAt(videoId: string | null, seconds: number): string | null {
  if (!videoId) return null;
  return `https://www.youtube.com/watch?v=${videoId}&t=${Math.max(0, seconds)}s`;
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return "—";
  return dayjs(value).fromNow();
}

export function formatDate(value: string, format = "MMM D, YYYY"): string {
  return dayjs(value).format(format);
}

export function formatDayLabel(value: string): string {
  const day = dayjs(value);
  if (day.isSame(dayjs(), "day")) return "Today";
  if (day.isSame(dayjs().subtract(1, "day"), "day")) return "Yesterday";
  return day.format("ddd, MMM D");
}

/** 7.5 → "7h 30m" */
export function formatHours(value: number | null | undefined): string {
  if (value == null) return "—";
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  if (minutes === 60) return `${hours + 1}h`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value == null) return "—";
  return Number(value).toFixed(digits).replace(/\.0$/, "");
}

export function initials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export function percent(value: number, max: number): number {
  if (!max) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}

export function greeting(): string {
  const hour = dayjs().hour();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export interface PasswordCheck {
  label: string;
  ok: boolean;
}

export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Contains a letter", ok: /[A-Za-z]/.test(password) },
    { label: "Contains a number", ok: /\d/.test(password) },
    { label: "Not longer than 72 bytes", ok: new TextEncoder().encode(password).length <= 72 },
  ];
}

export const ACTION_LABELS: Record<string, string> = {
  "admin.login": "Administrator signed in",
  "user.suspend": "Account suspended",
  "user.reactivate": "Account reactivated",
  "user.soft_delete": "Account deleted",
  "logs.backup": "Log copy saved",
};

/**
 * Human-friendly label for a private account reference, e.g. "Member 9C2E".
 *
 * The full identifier never leaves the database on list screens: only a short
 * code derived from it is shown, which is enough for an administrator to tell
 * two accounts apart without displaying the raw reference anywhere.
 */
export function memberLabel(anonymizedId?: string | null): string {
  if (!anonymizedId) return "Unknown member";
  const code = anonymizedId.replace(/^anon_/i, "").slice(-4).toUpperCase();
  return code ? `Member ${code}` : "Unknown member";
}

/**
 * Short, non-reversible code for a failed sign-in against an unknown email.
 * Repeated attempts share the same code, so they can be correlated without
 * ever showing (or storing) the address.
 */
export function attemptCode(fingerprint?: string | null): string | null {
  if (!fingerprint) return null;
  const hex = fingerprint.replace(/^fp_/i, "");
  return hex ? `#${hex.slice(-6).toUpperCase()}` : null;
}

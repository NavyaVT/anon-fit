/**
 * WebAuthn helpers.
 *
 * A browser never exposes fingerprint data. Instead the platform authenticator
 * (Touch ID, Face ID, Android fingerprint, Windows Hello) signs a one-time
 * challenge with a private key that stays on the device. These helpers decide
 * whether the ceremony can run here and translate its errors into plain words.
 */

import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser";

/** Set after a passkey is created or used on this device. */
const DEVICE_MARKER = "anonfit-passkey-device";

export function isSecureContextForPasskeys(): boolean {
  return typeof window !== "undefined" && window.isSecureContext;
}

/** Passkeys need WebAuthn support and an HTTPS (or localhost) context. */
export async function passkeysSupported(): Promise<boolean> {
  if (!isSecureContextForPasskeys()) return false;
  if (!browserSupportsWebAuthn()) return false;
  try {
    const available = await platformAuthenticatorIsAvailable();
    // If the platform authenticator is unavailable (common on some mobile browsers),
    // still allow passkey usage if this device has previously enrolled a passkey.
    return available || isPasskeyDevice();
  } catch {
    // Fall back to device marker when detection fails.
    return isPasskeyDevice();
  }
}

export function markPasskeyDevice(): void {
  try {
    localStorage.setItem(DEVICE_MARKER, "1");
  } catch {
    // Storage can be unavailable in private modes; the lock simply stays off.
  }
}

export function clearPasskeyDevice(): void {
  try {
    localStorage.removeItem(DEVICE_MARKER);
  } catch {
    // Ignore.
  }
}

/** True when this browser has already enrolled or used a passkey. */
export function isPasskeyDevice(): boolean {
  try {
    return localStorage.getItem(DEVICE_MARKER) === "1";
  } catch {
    return false;
  }
}

/** Human-readable device label stored with the credential. */
export function describeDevice(): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const platform = /iPhone|iPad|iPod/i.test(ua)
    ? "iOS"
    : /Android/i.test(ua)
      ? "Android"
      : /Windows/i.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Unknown device";
  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /OPR\//i.test(ua)
      ? "Opera"
      : /Chrome\//i.test(ua)
        ? "Chrome"
        : /Firefox\//i.test(ua)
          ? "Firefox"
          : /Safari\//i.test(ua)
            ? "Safari"
            : "Browser";
  return `${browser} on ${platform}`;
}

const WEBAUTHN_ERROR_NAMES = new Set([
  "NotAllowedError",
  "AbortError",
  "SecurityError",
  "NotSupportedError",
  "InvalidStateError",
  "ConstraintError",
  "UnknownError",
]);

/** Whether this came from the WebAuthn call rather than the API. */
export function isPasskeyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (WEBAUTHN_ERROR_NAMES.has(error.name)) return true;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code.startsWith("ERROR_");
}

/** The user dismissed the OS prompt, or it timed out. */
export function isPasskeyCancellation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: unknown }).code;
  return (
    error.name === "NotAllowedError" ||
    error.name === "AbortError" ||
    code === "ERROR_CEREMONY_ABORTED"
  );
}

/**
 * The browser's own words for the failure, so the exact cause can be read
 * off the screen. Only added for errors thrown by the browser itself
 * (DOMException) — library-mapped errors are already explained above.
 */
function browserSaidDetail(error: unknown): string {
  if (!(error instanceof Error)) return "";
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string") return ""; // library error — already mapped
  const message = error.message?.trim();
  if (!message || message.length > 200) return "";
  return ` Browser said: “${message}”`;
}

export function describePasskeyError(error: unknown): string {
  const code = (error as { code?: unknown }).code;
  const name = error instanceof Error ? error.name : "";

  if (isPasskeyCancellation(error)) {
    return (
      "The fingerprint prompt was cancelled or timed out — or this phone could not " +
      "store the passkey. Check that the phone has a screen lock and that Google " +
      "Password Manager passkeys are switched on, then try again." +
      browserSaidDetail(error)
    );
  }
  if (code === "ERROR_INVALID_DOMAIN" || code === "ERROR_INVALID_RP_ID") {
    return "This web address cannot use passkeys. Open AnonFit over HTTPS or on localhost.";
  }
  if (code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") {
    return "This device is already enrolled. Remove it first to enroll it again.";
  }
  if (code === "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT") {
    return "This device's authenticator cannot store a sign-in passkey.";
  }
  if (code === "ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT") {
    return "This device cannot verify a fingerprint, face or PIN for sign-in.";
  }
  if (name === "SecurityError") {
    return "Passkeys require a secure connection (HTTPS).";
  }
  if (name === "NotSupportedError") {
    return "This browser does not support passkeys.";
  }
  if (error instanceof Error && error.message) {
    return `${error.message}${browserSaidDetail(error)}`;
  }
  return "Fingerprint verification failed.";
}

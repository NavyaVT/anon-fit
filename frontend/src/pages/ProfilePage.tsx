import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  Fingerprint,
  Hash,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  MonitorSmartphone,
  Moon,
  Plus,
  ShieldCheck,
  ShieldHalf,
  Smartphone,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";
import { startRegistration } from "@simplewebauthn/browser";
import { logoutAllSessions, logoutSession } from "@/api/auth";
import { getErrorMessage } from "@/api/client";
import { removePin, setPin } from "@/api/pin";
import {
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  listPasskeys,
  removePasskey,
} from "@/api/webauthn";
import { changePassword } from "@/api/users";
import AnonIdChip from "@/components/AnonIdChip";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import PasswordInput from "@/components/ui/PasswordInput";
import ThemeToggle from "@/components/ui/ThemeToggle";
import {
  clearPasskeyDevice,
  describeDevice,
  describePasskeyError,
  isPasskeyError,
  isSecureContextForPasskeys,
  markPasskeyDevice,
  passkeysSupported,
} from "@/lib/webauthn";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import type { Passkey, PasskeyList } from "@/types";
import {
  cn,
  formatDate,
  formatRelative,
  initials,
  memberLabel,
  passwordChecks,
} from "@/lib/utils";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const updateUser = useAuthStore((state) => state.updateUser);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const lock = useAuthStore((state) => state.lock);
  const theme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const [passkeys, setPasskeys] = useState<PasskeyList | null>(null);
  const [passkeysSupportedHere, setPasskeysSupportedHere] = useState(false);
  const [passkeyEnrolling, setPasskeyEnrolling] = useState(false);
  const [passkeyToRemove, setPasskeyToRemove] = useState<Passkey | null>(null);
  const [removingPasskey, setRemovingPasskey] = useState(false);

  const [pin, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinStepup, setPinStepup] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [savingPin, setSavingPin] = useState(false);
  const [pinToRemove, setPinToRemove] = useState(false);
  const [removingPin, setRemovingPin] = useState(false);

  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let alive = true;

    void passkeysSupported().then((supported) => {
      if (alive) setPasskeysSupportedHere(supported);
    });

    void listPasskeys()
      .then((list) => {
        if (alive) setPasskeys(list);
      })
      .catch(() => {
        if (alive) setPasskeys({ enabled: false, items: [] });
      });

    return () => {
      alive = false;
    };
  }, []);

  if (!user) return null;

  const checks = passwordChecks(newPassword);
  const allChecksPass = checks.every((check) => check.ok);

  async function handlePasswordChange(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Enter your current password.");
      return;
    }
    if (!allChecksPass) {
      setPasswordError("Your new password does not meet the requirements yet.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await changePassword(currentPassword, newPassword);
      setSession(response);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(response.message);
    } catch (err) {
      setPasswordError(getErrorMessage(err, "Could not change your password"));
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleEnablePasskey() {
    if (!user) return;
    setPasskeyEnrolling(true);
    try {
      const options = await beginPasskeyRegistration();
      const credential = await startRegistration({ optionsJSON: options });
      await finishPasskeyRegistration(credential, describeDevice());
      const list = await listPasskeys();
      setPasskeys(list);
      markPasskeyDevice();
      updateUser({ ...user, biometricEnabled: list.enabled });
      toast.success("Fingerprint sign-in enabled on this device");
    } catch (err) {
      toast.error(
        isPasskeyError(err)
          ? describePasskeyError(err)
          : getErrorMessage(err, "Could not enable fingerprint sign-in"),
      );
    } finally {
      setPasskeyEnrolling(false);
    }
  }

  async function handleRemovePasskey() {
    if (!passkeyToRemove || !user) return;
    setRemovingPasskey(true);
    try {
      const list = await removePasskey(passkeyToRemove.id);
      setPasskeys(list);
      if (!list.enabled) clearPasskeyDevice();
      updateUser({ ...user, biometricEnabled: list.enabled });
      setPasskeyToRemove(null);
      toast.success("Passkey removed");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not remove this passkey"));
    } finally {
      setRemovingPasskey(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      if (refreshToken) await logoutSession(refreshToken);
    } catch {
      // Local sign-out must always work.
    } finally {
      clearSession();
      navigate("/login", { replace: true });
      toast.success("Signed out");
    }
  }

  async function handleLogoutAll() {
    setLoggingOutAll(true);
    try {
      await logoutAllSessions();
      clearSession();
      navigate("/login", { replace: true });
      toast.success("Signed out of all devices");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not sign out all devices"));
    } finally {
      setLoggingOutAll(false);
    }
  }

  async function handlePinSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPinError(null);
    if (!user) return;

    if (!/^\d{4}$/.test(pin)) {
      setPinError("Choose a PIN with exactly 4 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setPinError("The two PINs do not match.");
      return;
    }
    const hasPin = Boolean(user.pinEnabled);
    if (!pinStepup) {
      setPinError(
        hasPin
          ? "Enter your current PIN or password to confirm."
          : "Enter your current password to confirm.",
      );
      return;
    }

    setSavingPin(true);
    try {
      // When a PIN already exists the confirmation field may hold either the
      // current PIN or the password; the API checks both against their hashes.
      const response = await setPin(
        pin,
        hasPin && /^\d{4}$/.test(pinStepup) ? pinStepup : undefined,
        pinStepup,
      );
      updateUser({ ...user, pinEnabled: response.pinEnabled });
      setPinValue("");
      setConfirmPin("");
      setPinStepup("");
      toast.success(response.message);
    } catch (err) {
      setPinError(getErrorMessage(err, "Could not save your PIN"));
    } finally {
      setSavingPin(false);
    }
  }

  async function handlePinRemove() {
    setRemovingPin(true);
    if (!user) {
      setRemovingPin(false);
      return;
    }
    try {
      const looksLikePin = /^\d{4}$/.test(pinStepup);
      const response = await removePin(
        looksLikePin ? pinStepup : undefined,
        looksLikePin ? undefined : pinStepup,
      );
      updateUser({ ...user, pinEnabled: response.pinEnabled });
      setPinToRemove(false);
      setPinStepup("");
      setPinValue("");
      setConfirmPin("");
      toast.success(response.message);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not remove your PIN"));
    } finally {
      setRemovingPin(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Profile & security"
        description="Manage your credentials, passkeys and sessions. Your health data never travels with your email."
        actions={
          <Badge tone={user.status === "active" ? "brand" : "rose"} dot>
            {user.status}
          </Badge>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Identity */}
          <section className="card card-pad animate-fade-up">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-400/25 to-cyan-400/20 font-display text-lg font-semibold text-brand-700 dark:text-brand-200">
                {initials(user.email)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-display text-lg font-semibold text-slate-900 dark:text-white">
                    {user.email}
                  </h2>
                  <Badge tone={user.role === "admin" ? "amber" : "brand"}>
                    {user.role === "admin" ? (
                      <>
                        <ShieldHalf className="h-3 w-3" /> Admin
                      </>
                    ) : (
                      "User"
                    )}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Member since {formatDate(user.createdAt)}
                  {user.lastLoginAt ? ` · Last login ${formatRelative(user.lastLoginAt)}` : ""}
                </p>
                <div className="mt-3">
                  <AnonIdChip anonymizedId={user.anonymizedId} />
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/70 px-3.5 py-3 dark:border-white/[0.06]">
                <Mail className="h-4 w-4 shrink-0 text-violet-500" />
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-slate-400">
                    Sign-in email
                  </p>
                  <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/70 px-3.5 py-3 dark:border-white/[0.06]">
                <ShieldCheck className="h-4 w-4 shrink-0 text-brand-500" />
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-slate-400">
                    Private member code
                  </p>
                  <p className="truncate text-xs font-semibold text-brand-600 dark:text-brand-300">
                    {memberLabel(user.anonymizedId)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Fingerprint sign-in */}
          <section className="card card-pad animate-fade-up [animation-delay:60ms]">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500 dark:text-violet-300">
                <Fingerprint className="h-5 w-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    Fingerprint sign-in
                  </h2>
                  <Badge tone={passkeys?.enabled ? "brand" : "slate"} dot>
                    {passkeys?.enabled ? "Enabled" : "Not set up"}
                  </Badge>
                </div>
                <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Sign in and unlock AnonFit with the fingerprint, face or device PIN
                  already set up on this device. The sensor never leaves your device —
                  AnonFit only verifies a signed, single-use challenge.
                </p>
              </div>
            </div>

            {!passkeysSupportedHere && (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] px-3.5 py-3 text-[11px] font-medium leading-relaxed text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {!isSecureContextForPasskeys()
                    ? "You're opening AnonFit over an unprotected address (it doesn't start with https://). Browsers only allow fingerprints on secure connections — open the secure https:// link instead, and this option will appear."
                    : "This browser can't use a fingerprint yet. Open AnonFit in a recent browser on a phone or laptop that has a fingerprint, face unlock or screen PIN set up — your Unlock PIN below works either way."}
                </span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                loading={passkeyEnrolling}
                disabled={!passkeysSupportedHere}
                onClick={() => void handleEnablePasskey()}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                {passkeys?.enabled ? "Add this device" : "Enable on this device"}
              </Button>
              {(passkeys?.enabled || user.pinEnabled) && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<LockKeyhole className="h-3.5 w-3.5" />}
                  onClick={() => {
                    lock();
                    toast("App locked");
                  }}
                >
                  Lock now
                </Button>
              )}
            </div>

            {passkeys && passkeys.items.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-slate-200/70 pt-4 dark:border-white/[0.06]">
                {passkeys.items.map((passkey) => (
                  <li
                    key={passkey.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200/70 px-3.5 py-3 dark:border-white/[0.06]"
                  >
                    <MonitorSmartphone className="h-4 w-4 shrink-0 text-violet-500 dark:text-violet-300" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {passkey.label}
                        </p>
                        {passkey.backedUp && <Badge tone="cyan">Synced</Badge>}
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                        Added {formatDate(passkey.createdAt)}
                        {passkey.lastUsedAt
                          ? ` · Last used ${formatRelative(passkey.lastUsedAt)}`
                          : " · Not used yet"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${passkey.label}`}
                      onClick={() => setPasskeyToRemove(passkey)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-3 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
              A passkey belongs to the web address it was created on, so enable it once
              on each device you want to sign in from. Manage them any time from this
              list.
            </p>
          </section>

          {/* Unlock PIN */}
          <section className="card card-pad animate-fade-up [animation-delay:90ms]">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                <Hash className="h-5 w-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    Unlock PIN
                  </h2>
                  <Badge tone={user.pinEnabled ? "brand" : "slate"} dot>
                    {user.pinEnabled ? "Enabled" : "Not set up"}
                  </Badge>
                </div>
                <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  A 4-digit PIN opens the privacy lock when a fingerprint isn't available
                  on this device. Your fingerprint and PIN can both stay on — you choose
                  at the lock screen. The PIN is stored only as a one-way hash and never
                  signs you in by itself.
                </p>
              </div>
            </div>

            <form onSubmit={handlePinSubmit} className="mt-4 space-y-4">
              {pinError && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-300">
                  {pinError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={user.pinEnabled ? "New 4-digit PIN" : "4-digit PIN"}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(event) =>
                    setPinValue(event.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  required
                />
                <Input
                  label={user.pinEnabled ? "Repeat new PIN" : "Repeat PIN"}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(event) =>
                    setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  required
                />
              </div>

              <Input
                label={user.pinEnabled ? "Current PIN or password" : "Current password"}
                type="password"
                autoComplete={user.pinEnabled ? "off" : "current-password"}
                placeholder={
                  user.pinEnabled
                    ? "Confirm with your current PIN or password"
                    : "Confirm with your password"
                }
                value={pinStepup}
                onChange={(event) => setPinStepup(event.target.value)}
                required
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" size="sm" loading={savingPin}>
                  {user.pinEnabled ? "Change PIN" : "Set PIN"}
                </Button>
                {user.pinEnabled && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => {
                      if (!pinStepup) {
                        setPinError(
                          "Enter your current PIN or password first, then choose Remove PIN.",
                        );
                        return;
                      }
                      setPinError(null);
                      setPinToRemove(true);
                    }}
                  >
                    Remove PIN
                  </Button>
                )}
              </div>
            </form>

            <ConfirmDialog
              open={pinToRemove}
              onClose={() => setPinToRemove(false)}
              onConfirm={() => void handlePinRemove()}
              title="Remove your PIN?"
              description="You'll keep fingerprint sign-in and your password. You can set a new PIN at any time."
              confirmLabel="Remove PIN"
              loading={removingPin}
            />
          </section>

          {/* Password */}
          <section className="card card-pad animate-fade-up [animation-delay:120ms]">
            <div className="mb-5 flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Change password
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Changing your password revokes every other session. This device stays
                  signed in with a fresh token pair.
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {passwordError && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-300">
                  {passwordError}
                </div>
              )}

              <PasswordInput
                label="Current password"
                autoComplete="current-password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <PasswordInput
                  label="New password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
                <PasswordInput
                  label="Confirm new password"
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  error={
                    confirmPassword && newPassword !== confirmPassword
                      ? "Passwords do not match"
                      : undefined
                  }
                  required
                />
              </div>

              {newPassword && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {checks.map((check) => (
                    <div
                      key={check.label}
                      className={cn(
                        "flex items-center gap-1.5 text-[11px]",
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
              )}

              <Button type="submit" loading={changingPassword} size="sm">
                Update password
              </Button>
            </form>
          </section>

          {/* Sessions */}
          <section className="card card-pad animate-fade-up [animation-delay:180ms]">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                <MonitorSmartphone className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Sessions
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Access tokens last 30 minutes. Refresh tokens rotate on every use and
                  can be revoked instantly.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={signingOut}
                    onClick={() => void handleSignOut()}
                    leftIcon={<LogOut className="h-3.5 w-3.5" />}
                  >
                    Sign out this device
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setLogoutAllOpen(true)}
                    leftIcon={<Smartphone className="h-3.5 w-3.5" />}
                  >
                    Sign out all devices
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right column */}
        <aside className="space-y-5">
          <section className="card card-pad animate-fade-up [animation-delay:90ms]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 dark:text-brand-300">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Your privacy model
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.035] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-300">
                  Your account
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Your email and a scrambled copy of your password — used only to sign
                  you in.
                </p>
              </div>
              <div className="flex justify-center">
                <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-brand-600 dark:text-brand-300">
                  {memberLabel(user.anonymizedId)}
                </span>
              </div>
              <div className="rounded-2xl border border-brand-500/15 bg-brand-500/[0.035] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                  Your health data
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Your workouts, water, sleep, screen time and app name — stored under
                  your private code, with no personal details attached.
                </p>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
                An administrator can pause an account and see anonymous health numbers,
                but there is no screen or report anywhere in AnonFit that shows your
                email next to your health data.
              </p>
            </div>
          </section>

          <section className="card card-pad animate-fade-up [animation-delay:140ms]">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Appearance
            </h2>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 dark:text-slate-300">
                  {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {theme === "dark" ? "Dark" : "Light"} theme
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Saved to this browser
                  </p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </section>

          <section className="card card-pad animate-fade-up [animation-delay:180ms]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-300">
                <UserRound className="h-4 w-4" />
              </span>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Account facts
              </h2>
            </div>
            <dl className="mt-4 space-y-3">
              {[
                ["Role", user.role === "admin" ? "Administrator" : "User"],
                ["Status", user.status],
                ["Created", formatDate(user.createdAt)],
                ["Last login", formatRelative(user.lastLoginAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <dt className="text-[11px] text-slate-400 dark:text-slate-500">{label}</dt>
                  <dd className="text-[11px] font-medium capitalize text-slate-700 dark:text-slate-200">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(passkeyToRemove)}
        onClose={() => setPasskeyToRemove(null)}
        onConfirm={handleRemovePasskey}
        title="Remove this passkey?"
        description={`${passkeyToRemove?.label ?? "This device"} will no longer be able to sign in with a fingerprint. You can still use your password and enroll the device again later.`}
        confirmLabel="Remove passkey"
        loading={removingPasskey}
      />

      <ConfirmDialog
        open={logoutAllOpen}
        onClose={() => setLogoutAllOpen(false)}
        onConfirm={handleLogoutAll}
        title="Sign out of all devices?"
        description="Every refresh token for this account will be revoked immediately, including this browser. You will need to sign in again."
        confirmLabel="Sign out everywhere"
        loading={loggingOutAll}
      />
    </div>
  );
}

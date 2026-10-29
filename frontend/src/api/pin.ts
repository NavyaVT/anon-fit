/** 4-digit app-lock PIN endpoints. The PIN is never stored on this side. */

import type { PasskeyVerify, PinActionResponse } from "@/types";
import api from "./client";

export async function setPin(
  pin: string,
  currentPin?: string,
  currentPassword?: string,
): Promise<PinActionResponse> {
  const { data } = await api.post<PinActionResponse>("/users/me/pin", {
    pin,
    currentPin: currentPin || null,
    currentPassword: currentPassword || null,
  });
  return data;
}

export async function unlockWithPin(pin: string): Promise<PasskeyVerify> {
  const { data } = await api.post<PasskeyVerify>("/users/me/pin/unlock", { pin });
  return data;
}

export async function removePin(
  currentPin?: string,
  currentPassword?: string,
): Promise<PinActionResponse> {
  const { data } = await api.delete<PinActionResponse>("/users/me/pin", {
    data: { currentPin: currentPin || null, currentPassword: currentPassword || null },
  });
  return data;
}

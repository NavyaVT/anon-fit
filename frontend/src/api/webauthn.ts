/** Passkey ceremony endpoints. The browser objects are opaque to the API layer. */

import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import type { AuthResponse, Passkey, PasskeyList, PasskeyVerify } from "@/types";
import api from "./client";

export async function beginPasskeyRegistration(): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const { data } = await api.post<PublicKeyCredentialCreationOptionsJSON>(
    "/auth/webauthn/register/begin",
  );
  return data;
}

export async function finishPasskeyRegistration(
  credential: RegistrationResponseJSON,
  label: string,
): Promise<Passkey> {
  const transports = (credential.response as { transports?: string[] }).transports ?? [];
  const { data } = await api.post<Passkey>("/auth/webauthn/register/finish", {
    credential,
    label,
    transports,
  });
  return data;
}

export async function beginPasskeyLogin(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const { data } = await api.post<PublicKeyCredentialRequestOptionsJSON>(
    "/auth/webauthn/login/begin",
  );
  return data;
}

export async function finishPasskeyLogin(
  credential: AuthenticationResponseJSON,
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/webauthn/login/finish", { credential });
  return data;
}

export async function beginPasskeyUnlock(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const { data } = await api.post<PublicKeyCredentialRequestOptionsJSON>(
    "/auth/webauthn/unlock/begin",
  );
  return data;
}

export async function finishPasskeyUnlock(
  credential: AuthenticationResponseJSON,
): Promise<PasskeyVerify> {
  const { data } = await api.post<PasskeyVerify>("/auth/webauthn/unlock/finish", {
    credential,
  });
  return data;
}

export async function listPasskeys(): Promise<PasskeyList> {
  const { data } = await api.get<PasskeyList>("/auth/webauthn/credentials");
  return data;
}

export async function removePasskey(id: string): Promise<PasskeyList> {
  const { data } = await api.delete<PasskeyList>(
    `/auth/webauthn/credentials/${encodeURIComponent(id)}`,
  );
  return data;
}

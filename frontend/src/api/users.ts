import api from "./client";
import type { ChangePasswordResponse, User } from "@/types";

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/users/me");
  return data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResponse> {
  const { data } = await api.post<ChangePasswordResponse>("/users/me/change-password", {
    currentPassword,
    newPassword,
  });
  return data;
}

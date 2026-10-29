import api from "./client";
import type { AuthResponse, MessageResponse } from "@/types";

export async function registerUser(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register", { email, password });
  return data;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  return data;
}

export async function loginAdmin(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/admin/login", { email, password });
  return data;
}

export async function logoutSession(refreshToken: string): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>("/auth/logout", { refreshToken });
  return data;
}

export async function logoutAllSessions(): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>("/auth/logout-all");
  return data;
}

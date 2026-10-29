import api from "./client";
import type {
  AdminActionResponse,
  AdminStats,
  AdminUserDetail,
  AdminUsersPage,
  AuditPage,
  SystemLogPage,
  SystemLogStats,
} from "@/types";

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>("/admin/stats");
  return data;
}

export async function getAdminUsers(params: {
  page?: number;
  limit?: number;
  status?: "all" | "active" | "suspended" | "deleted";
  search?: string;
}): Promise<AdminUsersPage> {
  const { data } = await api.get<AdminUsersPage>("/admin/users", { params });
  return data;
}

export async function getAdminUser(
  anonymizedId: string,
  days = 7,
): Promise<AdminUserDetail> {
  const { data } = await api.get<AdminUserDetail>(
    `/admin/users/${encodeURIComponent(anonymizedId)}`,
    { params: { days } },
  );
  return data;
}

export async function setUserStatus(
  anonymizedId: string,
  status: "active" | "suspended",
): Promise<AdminActionResponse> {
  const { data } = await api.patch<AdminActionResponse>(
    `/admin/users/${encodeURIComponent(anonymizedId)}/status`,
    { status },
  );
  return data;
}

export async function softDeleteUser(anonymizedId: string): Promise<AdminActionResponse> {
  const { data } = await api.delete<AdminActionResponse>(
    `/admin/users/${encodeURIComponent(anonymizedId)}`,
  );
  return data;
}

export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  action?: string;
}): Promise<AuditPage> {
  const { data } = await api.get<AuditPage>("/admin/audit-logs", { params });
  return data;
}

export async function getLogStats(): Promise<SystemLogStats> {
  const { data } = await api.get<SystemLogStats>("/admin/logs/stats");
  return data;
}

export async function getSystemLogs(params: {
  page?: number;
  limit?: number;
  level?: string;
  category?: string;
  search?: string;
}): Promise<SystemLogPage> {
  const { data } = await api.get<SystemLogPage>("/admin/logs", { params });
  return data;
}

/**
 * Download the whole `system_logs` table as a `.log` file.
 *
 * The server writes the file from the cloud database and purges the exported
 * rows right away, so logging restarts from an empty table afterwards.
 * Returns the file name and how many events were exported.
 */
export async function backupSystemLogs(): Promise<{ filename: string; count: number }> {
  const response = await api.post("/admin/logs/backup", null, {
    responseType: "blob",
    timeout: 60_000,
  });

  const disposition = String(response.headers["content-disposition"] ?? "");
  const filename =
    /filename="?([^"]+)"?/i.exec(disposition)?.[1] ?? "anonfit-system-logs.log";
  const count = Number(response.headers["x-log-export-count"] ?? 0);

  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before releasing the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 5_000);

  return { filename, count };
}

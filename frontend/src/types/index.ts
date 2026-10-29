/** Shared API types. All payloads use camelCase. */

export type UserRole = "user" | "admin";
export type AccountStatus = "active" | "suspended" | "deleted";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  anonymizedId: string;
  biometricEnabled: boolean;
  pinEnabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface SessionPayload {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface AuthResponse extends SessionPayload {
  user: User;
}

export interface ChangePasswordResponse extends SessionPayload {
  message: string;
  user: User;
}

export interface MessageResponse {
  message: string;
}

/* ------------------------------- Passkeys ------------------------------ */

export interface Passkey {
  id: string;
  label: string;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface PasskeyList {
  enabled: boolean;
  items: Passkey[];
}

export interface PasskeyVerify {
  verified: boolean;
  anonymizedId: string | null;
}

export interface PinActionResponse {
  message: string;
  pinEnabled: boolean;
}

/* ------------------------------- Health -------------------------------- */

export interface Exercise {
  index: number;
  name: string;
  startSeconds: number;
  timestamp: string;
  completed: boolean;
}

export interface WorkoutPlan {
  id: string;
  title: string;
  youtubeUrl: string | null;
  videoId: string | null;
  exercises: Exercise[];
  exerciseCount: number;
  createdAt: string;
}

export interface WorkoutToday {
  planId: string;
  title: string;
  youtubeUrl: string | null;
  videoId: string | null;
  exercises: Exercise[];
  completedCount: number;
  total: number;
  completed: boolean;
}

export interface WeeklyPoint {
  date: string;
  label: string;
  waterGlasses: number;
  screenTimeHours: number | null;
  sleepHours: number | null;
  workoutCompleted: boolean;
}

export interface TodayData {
  date: string;
  waterGlasses: number;
  waterGoal: number;
  screenTimeHours: number | null;
  mostUsedApp: string | null;
  sleepHours: number | null;
  sleepGoal: number;
  workout: WorkoutToday | null;
  streak: number;
  weekly: WeeklyPoint[];
}

export interface HealthDay {
  date: string;
  waterGlasses: number;
  screenTimeHours: number | null;
  mostUsedApp: string | null;
  sleepHours: number | null;
  workoutCompleted: boolean;
  completedExercises: number[];
  planId: string | null;
  updatedAt: string | null;
}

export interface HistoryResponse {
  days: HealthDay[];
  streak: number;
}

export interface ToggleExerciseResponse {
  date: string;
  planId: string;
  completedExercises: number[];
  completedCount: number;
  total: number;
  workoutCompleted: boolean;
  streak: number;
}

export interface MetricsPayload {
  screenTimeHours?: number;
  mostUsedApp?: string;
  sleepHours?: number;
  date?: string;
}

export interface WaterPayload {
  glasses: number;
  date?: string;
}

export interface CreatePlanPayload {
  title: string;
  youtubeUrl?: string;
  exercises: { name: string; startSeconds: number }[];
}

/* -------------------------------- Admin -------------------------------- */

export interface AdminWeeklyPoint {
  date: string;
  label: string;
  avgScreenTimeHours: number | null;
  avgSleepHours: number | null;
  workoutCompletionRate: number;
  trackedUsers: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  deletedUsers: number;
  avgScreenTimeHours: number | null;
  avgSleepHours: number | null;
  avgWaterGlasses: number;
  workoutCompletionRate: number;
  trackedDays: number;
  weekly: AdminWeeklyPoint[];
  generatedAt: string;
}

export interface AnonLatest {
  date: string;
  waterGlasses: number;
  screenTimeHours: number | null;
  mostUsedApp: string | null;
  sleepHours: number | null;
  workoutCompleted: boolean;
  updatedAt: string | null;
}

export interface AnonUserRow {
  anonymizedId: string;
  status: AccountStatus;
  createdAt: string;
  lastActiveAt: string | null;
  latest: AnonLatest | null;
  streak: number;
  trackingDays: number;
  completionRate7d: number;
}

export interface AdminUsersPage {
  items: AnonUserRow[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface AdminUserDetail {
  anonymizedId: string;
  status: AccountStatus;
  createdAt: string;
  streak: number;
  trackingDays: number;
  completionRate7d: number;
  history: HealthDay[];
}

export interface AuditEntry {
  id: string;
  actorAnonymizedId: string;
  action: string;
  targetAnonymizedId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditPage {
  items: AuditEntry[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface AdminActionResponse {
  message: string;
  anonymizedId: string;
  status: AccountStatus;
}

/* ----------------------------- System logs ----------------------------- */

export type LogLevel = "debug" | "info" | "warning" | "error" | "critical";
export type LogCategory = "auth" | "security" | "admin" | "data" | "system";

export interface SystemLogEntry {
  id: string;
  level: LogLevel;
  category: LogCategory | string;
  event: string;
  message: string;
  actorAnonymizedId: string | null;
  identifierFingerprint: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SystemLogPage {
  items: SystemLogEntry[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface LogLevelCount {
  level: string;
  count: number;
}

export interface LogEventCount {
  event: string;
  count: number;
}

export interface SystemLogStats {
  total: number;
  last24h: number;
  warnings24h: number;
  errors24h: number;
  securityEvents24h: number;
  byLevel: LogLevelCount[];
  topEvents: LogEventCount[];
  generatedAt: string;
}

import api from "./client";
import type {
  CreatePlanPayload,
  HealthDay,
  HistoryResponse,
  MessageResponse,
  MetricsPayload,
  TodayData,
  ToggleExerciseResponse,
  WaterPayload,
  WorkoutPlan,
} from "@/types";

export async function getToday(): Promise<TodayData> {
  const { data } = await api.get<TodayData>("/health/today");
  return data;
}

export async function getHistory(days = 14): Promise<HistoryResponse> {
  const { data } = await api.get<HistoryResponse>("/health/history", { params: { days } });
  return data;
}

export async function setWater(payload: WaterPayload): Promise<HealthDay> {
  const { data } = await api.patch<HealthDay>("/health/water", payload);
  return data;
}

export async function saveMetrics(payload: MetricsPayload): Promise<HealthDay> {
  const { data } = await api.patch<HealthDay>("/health/metrics", payload);
  return data;
}

export async function getPlans(): Promise<WorkoutPlan[]> {
  const { data } = await api.get<{ plans: WorkoutPlan[] }>("/health/plans");
  return data.plans;
}

export async function getPlan(planId: string): Promise<WorkoutPlan> {
  const { data } = await api.get<WorkoutPlan>(`/health/plans/${planId}`);
  return data;
}

export async function createPlan(payload: CreatePlanPayload): Promise<WorkoutPlan> {
  const { data } = await api.post<WorkoutPlan>("/health/plans", payload);
  return data;
}

export async function deletePlan(planId: string): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(`/health/plans/${planId}`);
  return data;
}

export async function toggleExercise(
  planId: string,
  exerciseIndex: number,
  date?: string,
): Promise<ToggleExerciseResponse> {
  const { data } = await api.post<ToggleExerciseResponse>(
    `/health/plans/${planId}/exercises/${exerciseIndex}/toggle`,
    undefined,
    { params: date ? { date } : undefined },
  );
  return data;
}

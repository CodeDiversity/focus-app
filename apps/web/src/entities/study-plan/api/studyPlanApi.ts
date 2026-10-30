import api from '@/shared/api/httpClient';
import type {
  PlanPreview,
  SavedPlan,
  ProposedSessionInput,
  RemainingWorkResponse,
} from '@/entities/study-plan/model/types';

export {
  type PlanPreview,
  type PlanPreviewDay,
  type PlanPreviewSession,
  type PlanPreviewWarning,
  type PlanWarning,
  type PlanWarningCategory,
  type PlanDeferred,
  type SavedPlan,
  type SavedPlanDay,
  type SavedPlanSession,
  type ProposedSession,
  type ProposedSessionInput,
  type PlanConflict,
  type RemainingWorkItem,
  type RemainingWorkResponse,
  type RemainingWorkFlag,
  CONFLICT_REASON_LABEL,
} from '@/entities/study-plan/model/types';

/**
 * Study-plan client (EP06F; EP06D owns the endpoints). Plain axios over the
 * shared transport (the entity-client precedent, D404-10).
 *
 * `POST /study-plans/preview` → `PlanPreview` (writes nothing).
 * `POST /study-plans` → `SavedPlan` (atomic; 400/409/401).
 * `GET /study-plans` (no query parameters) → `SavedPlan` (server names the
 * window — D06-23).
 */
export async function previewStudyPlan(): Promise<PlanPreview> {
  const response = await api.post<PlanPreview>('/study-plans/preview');
  return response.data;
}

export async function saveStudyPlan(
  from: string,
  to: string,
  sessions: ProposedSessionInput[]
): Promise<SavedPlan> {
  const response = await api.post<SavedPlan>('/study-plans', { from, to, sessions });
  return response.data;
}

export async function listStudyPlan(): Promise<SavedPlan> {
  const response = await api.get<SavedPlan>('/study-plans');
  return response.data;
}

export async function listRemainingWork(): Promise<RemainingWorkResponse> {
  const response = await api.get<RemainingWorkResponse>('/study-plans/remaining-work');
  return response.data;
}

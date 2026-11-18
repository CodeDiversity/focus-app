import api from '@/shared/api/httpClient';
import type {
  PlanPreview,
  SavedPlan,
  ProposedSessionInput,
  RemainingWorkResponse,
  RecoverySummary,
  CatchUpPreview,
  PlannedSessionLock,
  TodayPlan,
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
  type MissedSession,
  type RecoverySummary,
  type CatchUpPreview,
  type PlannedSessionLock,
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
/**
 * @deprecated Unused by the web client since EP16C (D16-4): every proposal uses
 * `previewCatchUp` / `confirmCatchUpPlan`. Removal of the API pair: BL-16-01.
 */
export async function previewStudyPlan(): Promise<PlanPreview> {
  const response = await api.post<PlanPreview>('/study-plans/preview');
  return response.data;
}

/**
 * @deprecated Unused by the web client since EP16C (D16-4): every proposal uses
 * `previewCatchUp` / `confirmCatchUpPlan`. Removal of the API pair: BL-16-01.
 */
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

/**
 * `GET /study-plans/today` (EP13C) → today's reconciled sessions, the single
 * recommended next session (or null with a reason) and the minutes already
 * confirmed inside today's profile-zone day. Reading it rolls unstarted past
 * sessions forward server-side, so the answer is always a current view.
 */
export async function getTodayPlan(): Promise<TodayPlan> {
  const response = await api.get<TodayPlan>('/study-plans/today');
  return response.data;
}

export async function listRemainingWork(): Promise<RemainingWorkResponse> {
  const response = await api.get<RemainingWorkResponse>('/study-plans/remaining-work');
  return response.data;
}

export async function getRecoverySummary(): Promise<RecoverySummary> {
  const response = await api.get<RecoverySummary>('/study-plans/recovery-summary');
  return response.data;
}

/**
 * `POST /study-plans/catch-up/preview` → `CatchUpPreview` (EP08C; writes
 * nothing — declining is simply not calling confirm).
 */
export async function previewCatchUp(): Promise<CatchUpPreview> {
  const response = await api.post<CatchUpPreview>('/study-plans/catch-up/preview');
  return response.data;
}

/**
 * `POST /study-plans/catch-up/confirm` → `SavedPlan` (EP08C; atomic, same
 * four-field body as `saveStudyPlan` — D06-23/D08 contract). 400 field
 * errors, 409 conflicts, 409 `WINDOW_ROLLED_OVER`, 401.
 */
export async function confirmCatchUpPlan(
  from: string,
  to: string,
  sessions: ProposedSessionInput[]
): Promise<SavedPlan> {
  const response = await api.post<SavedPlan>('/study-plans/catch-up/confirm', {
    from,
    to,
    sessions,
  });
  return response.data;
}

/**
 * `PATCH /study-plans/sessions/:sessionId/lock` → `{ id, locked }` (EP08E
 * note; the explicit lock toggle, D08-4). Errors ride through unchanged.
 */
export async function setPlannedSessionLock(
  sessionId: string,
  locked: boolean
): Promise<PlannedSessionLock> {
  const response = await api.patch<PlannedSessionLock>(`/study-plans/sessions/${sessionId}/lock`, {
    locked,
  });
  return response.data;
}

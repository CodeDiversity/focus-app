import type {
  PlanPreview,
  ProposedSession,
  ProposedSessionInput,
} from '@/entities/study-plan/model/types';

/**
 * Preview session helpers shared by the plan page (EP06) and the catch-up
 * preview (EP08E). Behavior-identical extraction from `PlanPage.tsx`
 * (decision 3 / Seams-and-wiring); `PlanPage.test.tsx` is the regression
 * guard.
 */

/** Flatten a preview's per-day sessions into one ordered editable list. */
export function flattenPreview(p: PlanPreview): ProposedSession[] {
  const out: ProposedSession[] = [];
  for (const day of p.days) {
    for (const s of day.sessions) {
      out.push({
        assignmentId: s.assignmentId,
        assignmentTitle: s.assignmentTitle,
        date: day.date,
        startTime: s.startTime,
        endTime: s.endTime,
        durationMinutes: s.durationMinutes,
      });
    }
  }
  return out;
}

/** The four-field save projection (D06-21) — the exact confirmed save body. */
export function projectSessions(sessions: ProposedSession[]): ProposedSessionInput[] {
  return sessions.map((s) => ({
    assignmentId: s.assignmentId,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
  }));
}

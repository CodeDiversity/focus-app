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
        // EP13H: the engine's partition rides through the editor (D-H10).
        anchor: s.anchor,
        windowHint: s.windowHint,
      });
    }
  }
  return out;
}

/**
 * The save projection (D06-21 + EP13G's anchor fields) — the exact save
 * body. `windowHint` is **omitted** on fixed sessions (D-H10): the server
 * 400s a hint on fixed, so the editor never constructs the combination.
 */
export function projectSessions(sessions: ProposedSession[]): ProposedSessionInput[] {
  return sessions.map((s) => ({
    assignmentId: s.assignmentId,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    anchor: s.anchor,
    ...(s.anchor === 'FLEX_DAY' && s.windowHint ? { windowHint: s.windowHint } : {}),
  }));
}

import type { PartOfDay, PlannedSessionAnchor } from './types';

/**
 * EP13H — the one shared vocabulary for how a session relates to the clock
 * (D-H1/D-H2): every surface renders a flex session's "time" through these
 * helpers, so the word is always **Anytime** and the suggested slot is never
 * printed as a flex session's primary time (AC-2, D13-9).
 */

/** The gentle hint suffix (D-H2): suggestion-flavoured, never a slot. */
export const WINDOW_HINT_LABEL: Record<PartOfDay, string> = {
  MORNING: 'morning suggested',
  AFTERNOON: 'afternoon suggested',
  EVENING: 'evening suggested',
};

export interface SessionTimeLabelInput {
  anchor: PlannedSessionAnchor;
  windowHint: PartOfDay | null;
  /** The formatted clock range of a fixed session (e.g. "9:00 – 10:00 AM"). */
  timeRange: string;
  durationMinutes: number;
  /** "Anytime today" on today surfaces, "Anytime" elsewhere (D-H1). */
  anytimeWord?: string;
}

/**
 * The meta line: fixed → `{range} · {n} min`; flex → `Anytime … · {n} min`
 * (+ the hint suffix when the engine suggested a part of day).
 */
export function sessionTimeLabel(input: SessionTimeLabelInput): string {
  const { anchor, windowHint, timeRange, durationMinutes } = input;
  if (anchor !== 'FLEX_DAY') {
    return `${timeRange} · ${durationMinutes} min`;
  }
  const lead = `${input.anytimeWord ?? 'Anytime'} · ${durationMinutes} min`;
  return windowHint ? `${lead} · ${WINDOW_HINT_LABEL[windowHint]}` : lead;
}

/**
 * The client side of the engine's mechanical hint mapping (EP13G's
 * `windowHintOf`, D-H6): used only when the editor *unpins* a session, so
 * the derived hint can never disagree with the suggestion it describes.
 */
export function windowHintFromStart(startTime: string): PartOfDay {
  const [hours] = startTime.split(':').map(Number);
  if ((hours || 0) < 12) return 'MORNING';
  if ((hours || 0) < 17) return 'AFTERNOON';
  return 'EVENING';
}

// Schedule blocks (EP15A model, EP15B API, EP15G UI) — the `/schedule/blocks`
// contract (docs/stories/EP15/contracts.md § API). A block is either a BUSY
// event (the student is not free) or a STUDY block (time set aside to study,
// which the planner fills first); one-off (`weekdays: null`) or weekly.

export type ScheduleBlockKind = 'BUSY' | 'STUDY';

/** EP13J's energy enum — moved here when EP15I deleted the availability entity. */
export type EnergyLevel = 'HIGH' | 'NORMAL' | 'LOW';

/** The `ScheduleBlock` response shape — `userId` is never exposed. */
export interface ScheduleBlock {
  id: string;
  kind: ScheduleBlockKind;
  title: string | null;
  courseId: string | null;
  energy: EnergyLevel | null;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // weekly only
  weekdays: number[] | null; // ascending 0…6 (Sunday = 0); null for a one-off
  startTime: string; // HH:mm
  endTime: string; // HH:mm, "24:00" allowed
  createdAt: string;
  updatedAt: string;
}

/** `POST /schedule/blocks` body (contracts § Field rules). */
export interface CreateScheduleBlockRequest {
  kind: ScheduleBlockKind;
  title?: string;
  courseId?: string; // STUDY only
  energy?: EnergyLevel; // STUDY only
  startDate: string;
  endDate?: string; // requires weekdays
  weekdays?: number[]; // 1–7 unique 0…6 → weekly; omitted → one-off
  startTime: string;
  endTime: string;
}

/**
 * `PATCH /schedule/blocks/:id` body: any subset of the POST fields except
 * `kind` (immutable, D-B1), plus `effectiveFrom` on a weekly block (split
 * from that date; contracts § PATCH semantics). `null` clears `title`,
 * `courseId`, `endDate` or `weekdays` (`weekdays: null` turns the series
 * into a one-off and must travel with `endDate: null` and `effectiveFrom`).
 */
export interface UpdateScheduleBlockRequest {
  title?: string | null;
  courseId?: string | null;
  energy?: EnergyLevel;
  startDate?: string;
  endDate?: string | null;
  weekdays?: number[] | null;
  startTime?: string;
  endTime?: string;
  effectiveFrom?: string;
}

// Availability Types — entity-layer home

/**
 * One recurring weekly availability slot (SP-128A contract, D404-5): the
 * 7-key shape the API returns — `userId` is never exposed. `dayOfWeek` is
 * 0–6 (Sunday=0 … Saturday=6, D112-1); `startTime`/`endTime` are 24-hour
 * `HH:mm` wall times (weekly recurring — no time-zone conversion, D404-4).
 * `isAvailable: true` is an available window (`AVAILABILITY` on the
 * calendar), `false` a blocked time (`BLOCKED_TIME`, D127B-5).
 */
export interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  /**
   * EP13J (D-J5) — the window's energy; the API always sends it (NORMAL for
   * every pre-EP13J row). Optional here so older fixtures stay valid.
   */
  energy?: EnergyLevel;
  createdAt: string;
  updatedAt: string;
}

/** EP13J (D-J5) — energy level of an available window. */
export type EnergyLevel = 'HIGH' | 'NORMAL' | 'LOW';

// Day bounds (EP15B API, EP15F UI) — the `GET/PUT /schedule/day-bounds`
// contract (docs/stories/EP15/contracts.md § API). Seven entries, Sunday = 0.

export interface DayBound {
  dayOfWeek: number; // 0–6, Sunday = 0
  wakeTime: string; // HH:mm, 00:00–23:59
  sleepTime: string; // HH:mm, strictly after wakeTime; "24:00" allowed (midnight end)
}

export interface DayBoundsResult {
  /** `true` only when a valid row exists for all seven weekdays. */
  configured: boolean;
  /** Seven entries in weekday order 0…6, defaults filled (08:00–23:00). */
  days: DayBound[];
}

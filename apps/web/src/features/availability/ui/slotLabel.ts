import type { AvailabilitySlot } from '@/entities/availability/model/types';

/** Full weekday names indexed by `dayOfWeek` (0 = Sunday … 6 = Saturday, D112-1). */
export const WEEKDAY_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Short weekday names indexed by `dayOfWeek` (0 = Sunday … 6 = Saturday, D112-1). */
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * The text labels for the slot's kind (D128B-4/D127B-5 — `CalendarEventChip`'s
 * vocabulary verbatim): `isAvailable: true` is "Available", `false` "Blocked".
 * The distinction is textual with a matching icon; never color-only.
 */
export function slotKindLabel(isAvailable: boolean): 'Available' | 'Blocked' {
  return isAvailable ? 'Available' : 'Blocked';
}

/**
 * The slot's time label (D128B-4 — the `meetingLabel` convention copied;
 * no cross-feature import per the FSD boundary): "Mon 09:00–10:30" — short
 * weekday from `dayOfWeek` 0–6, en dash, 24-hour `HH:mm` exactly as stored
 * (weekly recurring times of day — no time-zone conversion, D404-4).
 */
export function formatSlotLabel(
  slot: Pick<AvailabilitySlot, 'dayOfWeek' | 'startTime' | 'endTime'>
): string {
  const day = WEEKDAY_SHORT[slot.dayOfWeek] ?? '';
  return `${day} ${slot.startTime}–${slot.endTime}`;
}

/**
 * The row's **full name** (D128B-4): kind first, then the time label —
 * "Available Mon 09:00–10:30". The row actions' accessible names and the
 * dialog titles build on it, so identical times of different kinds never
 * collide in the accessibility tree ("identical" without the kind → both
 * "Mon 09:00–10:30"; with it, "Available…" vs "Blocked…").
 */
export function formatSlotName(
  slot: Pick<AvailabilitySlot, 'dayOfWeek' | 'startTime' | 'endTime' | 'isAvailable'>
): string {
  return `${slotKindLabel(slot.isAvailable)} ${formatSlotLabel(slot)}`;
}

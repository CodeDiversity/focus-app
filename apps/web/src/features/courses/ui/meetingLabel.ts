import type { ClassMeeting } from '@/shared/types/academic';

/** Short weekday names indexed by `dayOfWeek` (0 = Sunday … 6 = Saturday, D112-1). */
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * The recurring-meeting label (D112B-7): "Mon 09:00–10:30" — short weekday
 * from `dayOfWeek` 0–6, en dash, 24-hour `HH:mm` exactly as stored (recurring
 * times of day — no time-zone conversion, D112-1).  Shared by the section
 * rows, the delete copy, and the edit dialog title so the three never
 * diverge.
 */
export function formatMeetingLabel(
  meeting: Pick<ClassMeeting, 'dayOfWeek' | 'startTime' | 'endTime'>
): string {
  const day = WEEKDAY_SHORT[meeting.dayOfWeek] ?? '';
  return `${day} ${meeting.startTime}–${meeting.endTime}`;
}

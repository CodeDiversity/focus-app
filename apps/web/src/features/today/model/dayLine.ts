import { formatDate } from '@/shared/lib/datetime';

/**
 * EP16A (D16-10) — Today's day line. The payload's `today` is a civil date,
 * rendered verbatim (formatted in UTC — D05-6: the client does no zone
 * arithmetic). The profile zone is mentioned only when it differs from the
 * browser's zone, because that is the only time the student needs to know
 * which clock the times use.
 */
export function dayLine(civilDate: string, profileZone: string, browserZone: string): string {
  const date = formatDate(new Date(`${civilDate}T00:00:00Z`), 'UTC');
  return profileZone === browserZone
    ? `Today, ${date}`
    : `Today, ${date} · Times shown in ${profileZone}`;
}

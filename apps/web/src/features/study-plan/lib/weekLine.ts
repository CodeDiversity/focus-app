import { formatDate } from '@/shared/lib/datetime';

/**
 * EP16C (D-C5, refines D16-10) — the plan window line: "Oct 30, 2026 – Nov 5,
 * 2026", formatted in UTC from the civil dates (D05-6: no client zone
 * arithmetic). The profile zone is named only when it differs from the
 * browser's, so a student never meets a raw IANA id on the plan surfaces.
 */
export function weekLine(
  from: string,
  to: string,
  profileZone: string,
  browserZone: string
): string {
  const civil = (d: string) => formatDate(new Date(`${d}T00:00:00Z`), 'UTC');
  const base = `${civil(from)} – ${civil(to)}`;
  return profileZone === browserZone ? base : `${base} · Times shown in ${profileZone}`;
}

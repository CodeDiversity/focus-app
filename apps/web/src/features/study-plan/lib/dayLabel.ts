/**
 * EP17E (D-E4/D-E5, AC-E17-10) — the one human day label: "Wed, Nov 19".
 * Formatted in UTC from the civil date (D05-6: no client zone arithmetic,
 * matching `weekLine.ts` and `PlanWeek.tsx`'s weekday derivation) in `en-US`
 * (matching `shared/lib/datetime.ts`'s locale), so the app has one date
 * voice. The plan's time zone is named once in the week line when it differs
 * from the browser's — never repeated per day.
 */
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** `"2026-11-19"` → `"Wed, Nov 19"`. */
export function dayLabel(date: string): string {
  return DAY_LABEL_FORMAT.format(new Date(`${date}T00:00:00.000Z`));
}

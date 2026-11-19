import type { Preset } from '@/shared/ui/PresetRadioGroup';

/**
 * EP17G — the one spelling of the two plan-shaping choices. Both the proposal
 * (`features/plan-proposal/ui/PacingControls.tsx`) and Profile
 * (`features/study-preferences/ui/StudyPreferencesForm.tsx`) read these, so
 * the same choice cannot be worded two ways (D-G7's reason, applied to copy).
 *
 * No string here contains `%` — `src/test/forbiddenWords.ts` forbids the
 * character outright, so the spread lever is never shown as a percentage.
 */

/** `spreadPercent` 0…100, default 70 (contracts §2). Labels ruled by ▲ D-G5. */
export const SPREAD_PRESETS: ReadonlyArray<Preset> = [
  {
    value: 0,
    label: 'As early as possible',
    description: 'Fit everything into the first days that have room.',
  },
  {
    value: 70,
    label: 'A little each day',
    description: 'Share each piece of work across the days you have. The default.',
  },
  {
    value: 100,
    label: 'Evenly spread',
    description: 'Give every study day about the same amount.',
  },
];

export const SPREAD_LEGEND = 'How your week is paced';

/** Shown before any change is made (EP17G-AC2; D-G1, D-G4). */
export const SPREAD_CHANGE_SENTENCE =
  "Choosing one saves it for next time and builds this week again from scratch — any tweaks you've made here start over.";

/**
 * `weeklyGoalDays` 1…7, default 3 (EP13K values and labels kept). ▲ D17-2 (a)
 * made the number a planning instruction as well as the momentum yardstick;
 * D-G6 surfaces both meanings in one sentence on both surfaces. ▲ D17-16: an
 * unset number leaves the planner unconstrained, so the copy says "at most".
 */
export const GOAL_DAY_PRESETS: ReadonlyArray<Preset> = [
  { value: 2, label: 'Light', description: '2 days a week.' },
  { value: 3, label: 'Steady', description: '3 days a week — the default.' },
  { value: 5, label: 'Most days', description: '5 days a week.' },
];

export const STUDY_DAYS_LEGEND = 'Study days a week';

export const STUDY_DAYS_DESCRIPTION =
  "Your plan uses at most this many days of the week, and it's the number of days you're aiming to show up.";

/** The Custom label for a stored spread that is none of the presets (D-N2). */
export const SPREAD_CUSTOM_LABEL = () => 'Custom';

/** The Custom label for a stored day count that is none of the presets (D-N2). */
export const STUDY_DAYS_CUSTOM_LABEL = (n: number) => `Custom (${n} ${n === 1 ? 'day' : 'days'})`;

/**
 * The announcement after a rebuild settles (EP17G-AC2). `spreadLabel` is
 * `null` when the stored spread is none of the named presets — naming the
 * Custom option back at the student would say nothing, so the sentence drops
 * to the part that is true.
 */
export function pacingAnnouncement(spreadLabel: string | null, studyDayCount: number): string {
  const days = studyDayCount === 1 ? 'day' : 'days';
  const across = `across ${studyDayCount} ${days}`;
  return spreadLabel
    ? `New week ready — ${spreadLabel.toLowerCase()}, ${across}.`
    : `New week ready — ${across}.`;
}

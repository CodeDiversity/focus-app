import { useId, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { PresetRadioGroup, isPreset, withCustom } from '@/shared/ui/PresetRadioGroup';
import { putStudyPreferences } from '@/entities/study-preferences/api/studyPreferencesApi';
import {
  GOAL_DAY_PRESETS,
  SPREAD_CHANGE_SENTENCE,
  SPREAD_CUSTOM_LABEL,
  SPREAD_LEGEND,
  SPREAD_PRESETS,
  STUDY_DAYS_CUSTOM_LABEL,
  STUDY_DAYS_DESCRIPTION,
  STUDY_DAYS_LEGEND,
  pacingAnnouncement,
} from '@/entities/study-preferences/model/pacingPresets';
import type { PlanPacing } from '@/entities/study-plan/model/types';
import type { ReplanResult } from '../model/useProposal';

export const WRITE_ERROR = "We couldn't save that choice. Try again.";
export const REBUILD_ERROR =
  "We saved your choice but couldn't rebuild the week. Your current plan is still here.";

export interface PacingControlsProps {
  /** The effective values the payload reports (contracts §5). */
  pacing: PlanPacing;
  /** The non-destructive rebuild (`useProposal.replan`), run after the write. */
  onChanged: () => Promise<ReplanResult>;
  disabled?: boolean;
}

type ChangeKey = 'spreadPercent' | 'weeklyGoalDays';

/**
 * EP17G — the plan-time pacing levers, at the moment the student notices the
 * problem (▲ D17-8 (a), ▲ D-G1 (a), D-G2 (a), D-G3 (a)).
 *
 * Choosing an option writes **only** the changed key through the existing
 * `@CurrentUser()`-scoped `PUT /study-preferences` (the server merges —
 * contracts §2 invariant 2; no second client, no new endpoint) and then
 * rebuilds the week in place with `replan()`. Nothing here touches the
 * student's *plan*: **Use this plan** stays the only control that does.
 *
 * - No optimistic UI: in flight, both groups are disabled and the surface is
 *   `aria-busy`; the polite live region is written **once**, at the end, so a
 *   screen reader hears one message per change (EP17G-AC2).
 * - A failed write does not rebuild and leaves the previous selection shown
 *   (the selection is only recorded once the write succeeds). A failed
 *   rebuild leaves the previous proposal rendered and editable (D-G9) and
 *   offers **Try again**, which retries only the rebuild (EP17G-AC3).
 * - ▲ D17-16: the day count is "at most", never a promise of that many days.
 */
export function PacingControls({ pacing, onChanged, disabled = false }: PacingControlsProps) {
  const idBase = useId();
  // The last successfully saved choice wins over the payload's effective
  // value until the next payload arrives; a failed write never records one,
  // which is how the previous selection is restored (EP17G-AC3).
  const [chosen, setChosen] = useState<Partial<Record<ChangeKey, number>>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [lastAttempt, setLastAttempt] = useState<{ key: ChangeKey; value: number } | null>(null);

  const spreadValue = chosen.spreadPercent ?? pacing.spreadPercent;
  const dayValue = chosen.weeklyGoalDays ?? pacing.studyDays.length;

  const spreadOptions = withCustom(
    SPREAD_PRESETS,
    isPreset(SPREAD_PRESETS, spreadValue) ? null : spreadValue,
    SPREAD_CUSTOM_LABEL
  );
  const dayOptions = withCustom(
    GOAL_DAY_PRESETS,
    isPreset(GOAL_DAY_PRESETS, dayValue) ? null : dayValue,
    STUDY_DAYS_CUSTOM_LABEL
  );

  const spreadLabelFor = (value: number) =>
    SPREAD_PRESETS.find((p) => p.value === value)?.label ?? null;

  const rebuild = async (nextSpread: number) => {
    const result = await onChanged();
    if (!result.ok) {
      setError(REBUILD_ERROR);
      return;
    }
    const dayCount = result.pacing?.studyDays.length ?? pacing.studyDays.length;
    setAnnouncement(pacingAnnouncement(spreadLabelFor(nextSpread), dayCount));
  };

  const apply = async (key: ChangeKey, value: number) => {
    setPending(true);
    setError(null);
    setAnnouncement('');
    setLastAttempt({ key, value });
    try {
      await putStudyPreferences({ [key]: value });
    } catch {
      // Nothing is recorded in `chosen`, so the previous selection stands.
      setError(WRITE_ERROR);
      setPending(false);
      return;
    }
    const next = { ...chosen, [key]: value };
    setChosen(next);
    try {
      await rebuild(next.spreadPercent ?? pacing.spreadPercent);
    } finally {
      setPending(false);
    }
  };

  const select = (key: ChangeKey) => (value: number) => {
    if (pending || disabled) return;
    void apply(key, value);
  };

  /** Retries the whole change after a failed write, or only the rebuild. */
  const retry = async () => {
    if (error === WRITE_ERROR && lastAttempt) {
      await apply(lastAttempt.key, lastAttempt.value);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await rebuild(spreadValue);
    } finally {
      setPending(false);
    }
  };

  const busy = pending || disabled;

  return (
    <div className="space-y-4" data-testid="pacing-controls">
      <p className="text-sm text-text-muted">{SPREAD_CHANGE_SENTENCE}</p>

      <PresetRadioGroup
        name="proposal-spread"
        legend={SPREAD_LEGEND}
        options={spreadOptions}
        value={spreadValue}
        onSelect={select('spreadPercent')}
        disabled={busy}
        idBase={idBase}
      />

      <PresetRadioGroup
        name="proposal-study-days"
        legend={STUDY_DAYS_LEGEND}
        description={STUDY_DAYS_DESCRIPTION}
        options={dayOptions}
        value={dayValue}
        onSelect={select('weeklyGoalDays')}
        disabled={busy}
        idBase={idBase}
      />

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger-strong"
          data-testid="pacing-error"
        >
          <p>{error}</p>
          <Button className="mt-2 max-sm:min-h-[44px]" disabled={busy} onClick={() => void retry()}>
            Try again
          </Button>
        </div>
      ) : null}

      {/* Always present so the outcome is announced exactly once per change. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="min-h-5 text-sm text-text-muted"
      >
        {announcement}
      </div>
    </div>
  );
}

export default PacingControls;

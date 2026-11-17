import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Input } from '@/shared/ui/Input';
import { Switch } from '@/shared/ui/Switch';
import { apiErrorMessage, extractApiError, getErrorMessage } from '@/shared/lib/errors';
import { putDayBounds } from '@/entities/day-bounds/api/dayBoundsApi';
import type { DayBound, DayBoundsResult } from '@/entities/day-bounds/model/types';
import { MIDNIGHT_HELPER, minutesOfTime, toApiEndTime, toInputEndTime } from '../lib/midnight';

/** Rows Monday first (D15-14: the week the student sees), Sunday last. */
const ROW_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Pair = { wakeTime: string; sleepTime: string };
type Errors = Record<string, string | undefined>;

/** Validate one pair **after** the midnight mapping (R-EP15-11); messages mirror the API. */
export function validatePair(pair: Pair): { wakeTime?: string; sleepTime?: string } {
  const out: { wakeTime?: string; sleepTime?: string } = {};
  const wake = minutesOfTime(pair.wakeTime);
  const sleep = minutesOfTime(toApiEndTime(pair.sleepTime));
  if (wake === null) out.wakeTime = 'Enter a start time (HH:mm)';
  else if (wake >= 1440) out.wakeTime = 'Start time must be before 24:00';
  if (sleep === null) out.sleepTime = 'Enter an end time (HH:mm)';
  else if (wake !== null && wake < 1440 && sleep <= wake)
    out.sleepTime = 'End time must be after the start time';
  return out;
}

export interface DayBoundsSheetProps {
  bounds: DayBoundsResult;
  onClose: () => void;
  /** Called with the saved set; the page announces and re-reads the week. */
  onSaved: (saved: DayBoundsResult) => void;
}

/**
 * "When does your day start and end?" (EP15F-AC2/AC3; D15-13, D15-14 rules
 * 2–3): one question, one default answer, one switch. "Same every day" is on
 * when the seven stored pairs agree (a single pair, pre-filled, D-F3) and
 * off when they differ (seven rows, Monday first). Save sends exactly seven
 * entries (D-F2); `00:00` as an end means midnight and travels as `24:00`
 * (D-G6 mapping, validated after the mapping). A 400 maps to the matching
 * field. Shared `Dialog`: focus trap, Escape, focus return.
 */
export function DayBoundsSheet({ bounds, onClose, onSaved }: DayBoundsSheetProps) {
  const initial = useMemo(() => {
    const byDay = new Map(bounds.days.map((d) => [d.dayOfWeek, d]));
    const rows: Record<number, Pair> = {};
    for (const day of ROW_ORDER) {
      const b = byDay.get(day);
      rows[day] = {
        wakeTime: b?.wakeTime ?? '08:00',
        sleepTime: toInputEndTime(b?.sleepTime ?? '23:00'),
      };
    }
    const first = rows[1];
    const same = ROW_ORDER.every(
      (d) => rows[d].wakeTime === first.wakeTime && rows[d].sleepTime === first.sleepTime
    );
    return { rows, same };
  }, [bounds]);

  const [sameEveryDay, setSameEveryDay] = useState(initial.same);
  const [single, setSingle] = useState<Pair>(initial.rows[1]);
  const [rows, setRows] = useState<Record<number, Pair>>(initial.rows);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  /** The seven entries the API receives (weekday order 0…6). */
  const entries = (): DayBound[] =>
    [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
      const pair = sameEveryDay ? single : rows[dayOfWeek];
      return { dayOfWeek, wakeTime: pair.wakeTime, sleepTime: toApiEndTime(pair.sleepTime) };
    });

  const validate = (): boolean => {
    const next: Errors = {};
    if (sameEveryDay) {
      const e = validatePair(single);
      if (e.wakeTime) next['single.wakeTime'] = e.wakeTime;
      if (e.sleepTime) next['single.sleepTime'] = e.sleepTime;
    } else {
      for (const day of ROW_ORDER) {
        const e = validatePair(rows[day]);
        if (e.wakeTime) next[`${day}.wakeTime`] = e.wakeTime;
        if (e.sleepTime) next[`${day}.sleepTime`] = e.sleepTime;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /** Map the API's `days[<i>].<field>` keys onto the visible fields. */
  const mapApiErrors = (apiErrors: Record<string, string[]>): boolean => {
    const next: Errors = {};
    for (const [key, messages] of Object.entries(apiErrors)) {
      const m = /^days\[(\d)\]\.(wakeTime|sleepTime)$/.exec(key);
      const message = messages[0];
      if (!message) continue;
      if (m) {
        const field = m[2];
        next[sameEveryDay ? `single.${field}` : `${Number(m[1])}.${field}`] = message;
      } else if (key === 'days') {
        setFormError(message);
      }
    }
    setErrors(next);
    return Object.keys(next).length > 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const saved = await putDayBounds(entries());
      onSaved(saved);
    } catch (err) {
      const apiError = extractApiError(err);
      if (apiError && apiError.statusCode === 400) {
        const map = (apiError as { errors?: Record<string, string[]> }).errors;
        const mapped = map ? mapApiErrors(map) : false;
        if (!mapped && !formError) setFormError(apiErrorMessage(apiError));
      } else {
        toast.error(getErrorMessage(err) || 'We could not save your day. Try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * One wake/sleep pair. In per-day mode the fieldset legend carries the
   * weekday, so the visible labels are the short "Starts" / "Ends" and the
   * accessible name adds the weekday (label-in-name holds: the visible text
   * is contained in the name).
   */
  const pairFields = (
    pair: Pair,
    setPair: (p: Pair) => void,
    keyPrefix: string,
    weekday?: string
  ) => (
    <div className="grid grid-cols-2 gap-3">
      <Input
        label={weekday ? 'Starts' : 'Day starts'}
        aria-label={weekday ? `${weekday} starts` : undefined}
        type="time"
        value={pair.wakeTime}
        onChange={(e) => setPair({ ...pair, wakeTime: e.target.value })}
        error={errors[`${keyPrefix}.wakeTime`]}
        disabled={isSubmitting}
        required
      />
      <Input
        label={weekday ? 'Ends' : 'Day ends'}
        aria-label={weekday ? `${weekday} ends` : undefined}
        type="time"
        value={pair.sleepTime}
        onChange={(e) => setPair({ ...pair, sleepTime: e.target.value })}
        error={errors[`${keyPrefix}.sleepTime`]}
        hint={pair.sleepTime === '00:00' ? MIDNIGHT_HELPER : undefined}
        disabled={isSubmitting}
        required
      />
    </div>
  );

  return (
    <Dialog
      open
      onClose={requestClose}
      title="When does your day start and end?"
      description="The planner only places study time inside these hours. You can change them any time."
      busy={isSubmitting}
      className="max-h-[90vh] overflow-y-auto"
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Switch
          label="Same every day"
          hint="Turn off to set each weekday on its own."
          checked={sameEveryDay}
          onCheckedChange={setSameEveryDay}
          disabled={isSubmitting}
        />

        {sameEveryDay ? (
          pairFields(single, setSingle, 'single')
        ) : (
          <div className="space-y-3">
            {ROW_ORDER.map((day) => (
              <fieldset key={day} className="rounded-lg border border-border p-3">
                <legend className="px-1 text-sm font-medium text-text">{WEEKDAY[day]}</legend>
                {pairFields(
                  rows[day],
                  (p) => setRows({ ...rows, [day]: p }),
                  String(day),
                  WEEKDAY[day]
                )}
              </fieldset>
            ))}
          </div>
        )}

        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
          >
            {formError}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={requestClose}
            disabled={isSubmitting}
            className="max-sm:min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            data-dialog-commit
            className="max-sm:min-h-[44px]"
          >
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

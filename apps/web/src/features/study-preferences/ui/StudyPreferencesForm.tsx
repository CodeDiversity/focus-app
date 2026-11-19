import { useCallback, useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import { PresetRadioGroup, isPreset, withCustom } from '@/shared/ui/PresetRadioGroup';
import type { Preset } from '@/shared/ui/PresetRadioGroup';
import { extractApiError, getFieldError, getErrorMessage } from '@/shared/lib/errors';
import {
  getStudyPreferences,
  putStudyPreferences,
} from '@/entities/study-preferences/api/studyPreferencesApi';
import {
  GOAL_DAY_PRESETS,
  SPREAD_CUSTOM_LABEL,
  SPREAD_LEGEND,
  SPREAD_PRESETS,
  STUDY_DAYS_CUSTOM_LABEL,
  STUDY_DAYS_DESCRIPTION,
  STUDY_DAYS_LEGEND,
} from '@/entities/study-preferences/model/pacingPresets';
import type { StudyPreferences } from '@/entities/study-preferences/model/types';

const BOUNDS_MSG = 'Must be between 5 and 480.';
const DAILY_CAP_MSG = 'Must be between 5 and 1440.';
const BREAK_MSG = 'Must be between 0 and 60.';
const DENSITY_MSG = 'Must be between 50 and 100.';
const INTEGER_MSG = 'Must be a whole number.';
const DAILY_GOAL_MSG = 'Must be between 5 and 480.';
const WEEKLY_GOAL_MSG = 'Must be between 1 and 7.';
// EP17G: the spread lever's bounds mirror the server's (contracts §2).
const SPREAD_MSG = 'Must be between 0 and 100.';

const studyPreferencesSchema = z
  .object({
    sessionLengthMinutes: z
      .number({ invalid_type_error: INTEGER_MSG })
      .int(INTEGER_MSG)
      .min(5, BOUNDS_MSG)
      .max(480, BOUNDS_MSG),
    minSessionMinutes: z
      .number({ invalid_type_error: INTEGER_MSG })
      .int(INTEGER_MSG)
      .min(5, BOUNDS_MSG)
      .max(480, BOUNDS_MSG),
    maxSessionMinutes: z
      .number({ invalid_type_error: INTEGER_MSG })
      .int(INTEGER_MSG)
      .min(5, BOUNDS_MSG)
      .max(480, BOUNDS_MSG),
    dailyCapMinutes: z
      .number({ invalid_type_error: INTEGER_MSG })
      .int(INTEGER_MSG)
      .min(5, DAILY_CAP_MSG)
      .max(1440, DAILY_CAP_MSG),
    // EP13F (D13-5): the two placement levers. Neither takes part in a
    // cross-field rule, so no `.refine` below reads them.
    breakMinutes: z
      .number({ invalid_type_error: INTEGER_MSG })
      .int(INTEGER_MSG)
      .min(0, BREAK_MSG)
      .max(60, BREAK_MSG),
    densityPercent: z
      .number({ invalid_type_error: INTEGER_MSG })
      .int(INTEGER_MSG)
      .min(50, DENSITY_MSG)
      .max(100, DENSITY_MSG),
    // EP13K (D-K6/D-K7): the two momentum goals — named choices on the form,
    // integers in the contract. Independent of every cross-field rule.
    dailyGoalMinutes: z
      .number({ invalid_type_error: INTEGER_MSG })
      .int(INTEGER_MSG)
      .min(5, DAILY_GOAL_MSG)
      .max(480, DAILY_GOAL_MSG),
    weeklyGoalDays: z
      .number({ invalid_type_error: INTEGER_MSG })
      .int(INTEGER_MSG)
      .min(1, WEEKLY_GOAL_MSG)
      .max(7, WEEKLY_GOAL_MSG),
    // EP17A/EP17G (▲ D-A1, ▲ D-G5): how strongly the pacing target binds.
    // Takes part in no cross-field rule.
    spreadPercent: z
      .number({ invalid_type_error: INTEGER_MSG })
      .int(INTEGER_MSG)
      .min(0, SPREAD_MSG)
      .max(100, SPREAD_MSG),
  })
  .refine((data) => data.minSessionMinutes <= data.sessionLengthMinutes, {
    message: 'Shortest session must be no longer than the default session length.',
    path: ['minSessionMinutes'],
  })
  .refine((data) => data.sessionLengthMinutes <= data.maxSessionMinutes, {
    message: 'Longest session must be at least the default session length.',
    path: ['maxSessionMinutes'],
  })
  .refine((data) => data.dailyCapMinutes >= data.minSessionMinutes, {
    message: 'Daily cap must be at least the shortest session.',
    path: ['dailyCapMinutes'],
  });

type FormValues = z.infer<typeof studyPreferencesSchema>;

const DEFAULTS: FormValues = {
  sessionLengthMinutes: 60,
  minSessionMinutes: 15,
  maxSessionMinutes: 120,
  dailyCapMinutes: 240,
  breakMinutes: 15,
  densityPercent: 80,
  dailyGoalMinutes: 60,
  weeklyGoalDays: 3,
  spreadPercent: 70,
};

// EP13N (D-N1, D13-15): the density lever is asked as three named presets
// that write the integer the contract already stores. The percent appears
// only inside the description, as a translation, never as the thing to
// choose. Copy is fixed by the story's Design decisions table.
const DENSITY_PRESETS: ReadonlyArray<{ value: number; label: string; description: string }> = [
  {
    value: 60,
    label: 'Relaxed',
    description: 'Plenty of breathing room — about 60% of your free time.',
  },
  { value: 80, label: 'Balanced', description: 'Steady but not crowded — about 80%.' },
  { value: 100, label: 'Packed', description: 'Use nearly all your free time — 100%.' },
];

const isDensityPreset = (value: number) => isPreset(DENSITY_PRESETS, value);

// EP13K (D-K6/D-K7, D13-15): the goals reuse EP13N's named-choice control.
// Copy fixed by the story's UI/UX section (D-K10) — own units, no percent.
const GOAL_MINUTE_PRESETS: ReadonlyArray<Preset> = [
  { value: 30, label: 'Gentle', description: 'About 30 minutes. One short session counts.' },
  { value: 60, label: 'Steady', description: 'About an hour — the default.' },
  { value: 120, label: 'Ambitious', description: 'About two hours, for heavier weeks.' },
];
// EP17G (D-G7): `GOAL_DAY_PRESETS` and the spread presets live in
// `entities/study-preferences/model/pacingPresets.ts` so Profile and the
// proposal cannot spell the same choice two ways.

const FIELD_NAMES = [
  'sessionLengthMinutes',
  'minSessionMinutes',
  'maxSessionMinutes',
  'dailyCapMinutes',
  'breakMinutes',
  'densityPercent',
  'dailyGoalMinutes',
  'weeklyGoalDays',
  'spreadPercent',
] as const;

type PresetField = 'densityPercent' | 'dailyGoalMinutes' | 'weeklyGoalDays' | 'spreadPercent';

export function StudyPreferencesForm() {
  // (no stored-preferences state needed; the form is reset from the API
  // response on load and on save)
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  // EP13N (D-N2): a stored value that is none of the presets is shown
  // honestly as a pre-selected "Custom (n%)" option. It is derived from the
  // last server state (load or save), so it disappears only once a preset
  // has actually been saved — never snapped silently.
  const [customDensity, setCustomDensity] = useState<number | null>(null);
  // EP13K (D-K6/D-K7): the same honest-Custom rule for the two goals.
  const [customDailyGoal, setCustomDailyGoal] = useState<number | null>(null);
  const [customWeeklyGoal, setCustomWeeklyGoal] = useState<number | null>(null);
  // EP17G: the same honest-Custom rule for the spread lever.
  const [customSpread, setCustomSpread] = useState<number | null>(null);
  const idBase = useId();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(studyPreferencesSchema),
    defaultValues: DEFAULTS,
  });

  const densityPercent = watch('densityPercent');
  const dailyGoalMinutes = watch('dailyGoalMinutes');
  const weeklyGoalDays = watch('weeklyGoalDays');
  const spreadPercent = watch('spreadPercent');

  const selectPreset = (field: PresetField) => (value: number) =>
    setValue(field, value, { shouldDirty: true, shouldValidate: Boolean(errors[field]) });

  const applyServerState = useCallback(
    (server: StudyPreferences) => {
      // EP17A (D-A3) left `spreadPercent` optional on the client mirror; a
      // pre-EP17 response simply shows the contract default.
      const data: FormValues = { ...server, spreadPercent: server.spreadPercent ?? 70 };
      reset(data);
      setCustomDensity(isDensityPreset(data.densityPercent) ? null : data.densityPercent);
      setCustomDailyGoal(
        isPreset(GOAL_MINUTE_PRESETS, data.dailyGoalMinutes) ? null : data.dailyGoalMinutes
      );
      setCustomWeeklyGoal(
        isPreset(GOAL_DAY_PRESETS, data.weeklyGoalDays) ? null : data.weeklyGoalDays
      );
      setCustomSpread(isPreset(SPREAD_PRESETS, data.spreadPercent) ? null : data.spreadPercent);
    },
    [reset]
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getStudyPreferences();
      applyServerState(data);
    } catch (err) {
      setLoadError(getErrorMessage(err) || 'We could not load your study preferences. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [applyServerState]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    setStatusMessage('');
    try {
      const saved = await putStudyPreferences(data);
      applyServerState(saved);
      setStatusMessage('Study preferences saved.');
    } catch (err) {
      const apiError = extractApiError(err);
      if (apiError && apiError.statusCode === 400) {
        let mapped = false;
        for (const field of FIELD_NAMES) {
          const message = getFieldError(apiError, field);
          if (message) {
            setError(field, { type: 'server', message });
            mapped = true;
          }
        }
        if (!mapped) {
          toast.error(
            getErrorMessage(err) || 'We could not save your study preferences. Try again.'
          );
        }
      } else {
        toast.error(getErrorMessage(err) || 'We could not save your study preferences. Try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const densityOptions = withCustom(DENSITY_PRESETS, customDensity, (n) => `Custom (${n}%)`);
  const dailyGoalOptions = withCustom(
    GOAL_MINUTE_PRESETS,
    customDailyGoal,
    (n) => `Custom (${n} min)`
  );
  const weeklyGoalOptions = withCustom(GOAL_DAY_PRESETS, customWeeklyGoal, STUDY_DAYS_CUSTOM_LABEL);
  const spreadOptions = withCustom(SPREAD_PRESETS, customSpread, SPREAD_CUSTOM_LABEL);

  if (isLoading) {
    return (
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-text">Study preferences</h2>
        <p className="mt-1 text-sm text-text-muted">
          How long your study sessions should be. Used when generating a study plan.
        </p>
        <div className="flex items-center justify-center py-12">
          <Loader2
            className="animate-spin text-accent motion-reduce:animate-none"
            size={24}
            aria-hidden
          />
          <span className="ml-3 text-sm text-text-muted">Loading study preferences…</span>
        </div>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-text">Study preferences</h2>
        <p className="mt-1 text-sm text-text-muted">
          How long your study sessions should be. Used when generating a study plan.
        </p>
        <div
          role="alert"
          className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
        >
          <p>We could not load your study preferences. Try again.</p>
        </div>
        <Button className="mt-4" onClick={() => void load()}>
          Try again
        </Button>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <h2 className="text-lg font-semibold text-text">Study preferences</h2>
      <p className="mt-1 text-sm text-text-muted">
        How long your study sessions should be. Used when generating a study plan.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-6" noValidate>
        <fieldset className="space-y-4">
          <legend className="sr-only">Study session durations</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Default session length (minutes)"
              type="number"
              min={5}
              max={480}
              step={1}
              inputMode="numeric"
              hint="5–480"
              error={errors.sessionLengthMinutes?.message}
              disabled={isSaving}
              {...register('sessionLengthMinutes', { valueAsNumber: true })}
            />
            <Input
              label="Shortest session (minutes)"
              type="number"
              min={5}
              max={480}
              step={1}
              inputMode="numeric"
              hint="5–480"
              error={errors.minSessionMinutes?.message}
              disabled={isSaving}
              {...register('minSessionMinutes', { valueAsNumber: true })}
            />
            <Input
              label="Longest session (minutes)"
              type="number"
              min={5}
              max={480}
              step={1}
              inputMode="numeric"
              hint="5–480"
              error={errors.maxSessionMinutes?.message}
              disabled={isSaving}
              {...register('maxSessionMinutes', { valueAsNumber: true })}
            />
            <Input
              label="Daily cap (minutes)"
              type="number"
              min={5}
              max={1440}
              step={1}
              inputMode="numeric"
              hint="5–1440"
              error={errors.dailyCapMinutes?.message}
              disabled={isSaving}
              {...register('dailyCapMinutes', { valueAsNumber: true })}
            />
          </div>
        </fieldset>

        {/* EP13F (D13-5): the two levers of placement v2. EP13N (D13-15):
            the fill level is a named choice, the break stays a number (D-N3);
            both visible (D-N4); native fieldset/legend + radios as cards (D-N5). */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-text">How your days are filled</legend>
          <p className="text-sm text-text-muted">
            A break is the gap the plan leaves between one study session and the next. The fill
            level decides how much of your free time gets planned and how much stays open.
          </p>
          <div className="sm:max-w-xs">
            <Input
              label="Break between sessions (minutes)"
              type="number"
              min={0}
              max={60}
              step={1}
              inputMode="numeric"
              hint="0–60"
              error={errors.breakMinutes?.message}
              disabled={isSaving}
              {...register('breakMinutes', { valueAsNumber: true })}
            />
          </div>
          <PresetRadioGroup
            name="densityPercent"
            legend="Fill level"
            options={densityOptions}
            value={densityPercent}
            onSelect={selectPreset('densityPercent')}
            error={errors.densityPercent?.message}
            disabled={isSaving}
            idBase={idBase}
          />
          {/* EP17G (▲ D-G5): the spread lever, worded exactly as on the
              proposal — one component, one contract, one spelling. */}
          <PresetRadioGroup
            name="spreadPercent"
            legend={SPREAD_LEGEND}
            options={spreadOptions}
            value={spreadPercent}
            onSelect={selectPreset('spreadPercent')}
            error={errors.spreadPercent?.message}
            disabled={isSaving}
            idBase={idBase}
          />
        </fieldset>

        {/* EP13K (D-K6/D-K7): the momentum goals, as named choices (D13-15). */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-text">Your goals</legend>
          <p className="text-sm text-text-muted">
            A daily goal is the minutes you&apos;d like to reach on a study day. Small goals you
            actually hit beat big ones you dread.
          </p>
          <PresetRadioGroup
            name="dailyGoalMinutes"
            legend="Daily goal"
            options={dailyGoalOptions}
            value={dailyGoalMinutes}
            onSelect={selectPreset('dailyGoalMinutes')}
            error={errors.dailyGoalMinutes?.message}
            disabled={isSaving}
            idBase={idBase}
          />
          <PresetRadioGroup
            name="weeklyGoalDays"
            legend={STUDY_DAYS_LEGEND}
            description={STUDY_DAYS_DESCRIPTION}
            options={weeklyGoalOptions}
            value={weeklyGoalDays}
            onSelect={selectPreset('weeklyGoalDays')}
            error={errors.weeklyGoalDays?.message}
            disabled={isSaving}
            idBase={idBase}
          />
        </fieldset>

        {/* Always present so outcomes are announced (AC-3, D128B-12). */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="min-h-5 text-sm text-text-muted"
        >
          {statusMessage}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button type="submit" variant="primary" isLoading={isSaving} disabled={isSaving}>
            Save study preferences
          </Button>
        </div>
      </form>
    </Card>
  );
}

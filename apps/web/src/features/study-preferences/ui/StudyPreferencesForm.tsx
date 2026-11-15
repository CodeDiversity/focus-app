import { useCallback, useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import { extractApiError, getFieldError, getErrorMessage } from '@/shared/lib/errors';
import {
  getStudyPreferences,
  putStudyPreferences,
} from '@/entities/study-preferences/api/studyPreferencesApi';

const BOUNDS_MSG = 'Must be between 5 and 480.';
const DAILY_CAP_MSG = 'Must be between 5 and 1440.';
const BREAK_MSG = 'Must be between 0 and 60.';
const DENSITY_MSG = 'Must be between 50 and 100.';
const INTEGER_MSG = 'Must be a whole number.';

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

const isDensityPreset = (value: number) => DENSITY_PRESETS.some((p) => p.value === value);

const FIELD_NAMES = [
  'sessionLengthMinutes',
  'minSessionMinutes',
  'maxSessionMinutes',
  'dailyCapMinutes',
  'breakMinutes',
  'densityPercent',
] as const;

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

  const applyServerState = useCallback(
    (data: FormValues) => {
      reset(data);
      setCustomDensity(isDensityPreset(data.densityPercent) ? null : data.densityPercent);
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

  const densityOptions =
    customDensity === null
      ? DENSITY_PRESETS
      : [
          ...DENSITY_PRESETS,
          {
            value: customDensity,
            label: `Custom (${customDensity}%)`,
            description: 'What is saved right now. Pick a named option to change it.',
          },
        ];

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
          <fieldset
            className="space-y-2"
            aria-describedby={errors.densityPercent ? `${idBase}-density-error` : undefined}
          >
            <legend className="mb-2 block text-body-sm font-medium text-text">Fill level</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {densityOptions.map((option) => {
                const checked = densityPercent === option.value;
                const optionId = `${idBase}-density-${option.value}`;
                return (
                  <label
                    key={option.value}
                    className={clsx(
                      'flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors duration-base',
                      'focus-within:outline-none focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2',
                      checked
                        ? 'border-accent bg-accent/10'
                        : 'border-border bg-surface hover:border-border-strong',
                      isSaving && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <input
                      type="radio"
                      name="densityPercent"
                      value={option.value}
                      checked={checked}
                      onChange={() =>
                        setValue('densityPercent', option.value, {
                          shouldDirty: true,
                          shouldValidate: Boolean(errors.densityPercent),
                        })
                      }
                      aria-labelledby={`${optionId}-label`}
                      aria-describedby={`${optionId}-desc`}
                      // Explicit size + resets: the global base rule
                      // `input { @apply w-full … }` (index.css) would
                      // otherwise stretch this radio to the card width.
                      className="mt-1 h-4 w-4 shrink-0 border-0 bg-transparent p-0"
                      disabled={isSaving}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span id={`${optionId}-label`} className="text-sm font-medium text-text">
                          {option.label}
                        </span>
                        {checked && (
                          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent">
                            <CheckCircle2 aria-hidden size={14} data-icon="selected" />
                            Selected
                          </span>
                        )}
                      </span>
                      <span
                        id={`${optionId}-desc`}
                        className="mt-0.5 block text-xs text-text-muted"
                      >
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.densityPercent?.message && (
              <p id={`${idBase}-density-error`} className="text-body-sm text-danger">
                {errors.densityPercent.message}
              </p>
            )}
          </fieldset>
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

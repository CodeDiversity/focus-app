import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
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
};

const FIELD_NAMES = [
  'sessionLengthMinutes',
  'minSessionMinutes',
  'maxSessionMinutes',
  'dailyCapMinutes',
] as const;

export function StudyPreferencesForm() {
  // (no stored-preferences state needed; the form is reset from the API
  // response on load and on save)
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(studyPreferencesSchema),
    defaultValues: DEFAULTS,
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getStudyPreferences();
      reset(data);
    } catch (err) {
      setLoadError(getErrorMessage(err) || 'We could not load your study preferences. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    setStatusMessage('');
    try {
      const saved = await putStudyPreferences(data);
      reset(saved);
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

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import {
  apiErrorMessage,
  extractApiError,
  getFieldError,
  getErrorMessage,
} from '@/shared/lib/errors';
import { createSemester } from '@/entities/semester/api/semesterApi';
// RD7: sanctioned features → app import for typed dispatch hook
// eslint-disable-next-line import/no-restricted-paths
import { useAppDispatch } from '@/app/store/hooks';
import { advanceOnboarding } from '../model/onboardingSlice';

/**
 * Validation mirrors the SP-107B backend rules for `POST /semesters`:
 * name non-empty after trim, ≤ 100 chars; both dates required; `end > start`
 * (calendar dates compare chronologically as `yyyy-MM-dd` strings — the
 * backend re-validates, including the end-after-start rule, AC-107-06).
 */
const step2Schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Semester name is required')
      .max(100, 'Semester name must be 100 characters or fewer'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
  })
  // Both dates must be present to compare (the backend applies the rule only
  // then, so a missing date surfaces as its own "required" error, not a
  // confusing end-after-start one).
  .refine(
    (data) =>
      data.startDate.length > 0 && data.endDate.length > 0 ? data.endDate > data.startDate : true,
    { message: 'End date must be after the start date.', path: ['endDate'] }
  );

type Step2FormData = z.infer<typeof step2Schema>;

/**
 * Wizard step 2 — first semester (SP-107D).
 *
 * Semester name + start/end dates (native date inputs — `yyyy-MM-dd` values
 * sent as-is, D107-7). Submit creates the semester (`POST /semesters`,
 * SP-107B) and, on `201`, saves the progress with the created id
 * (`PATCH /onboarding { step: 3, semesterId }` — the id is persisted for
 * step-3 resume, D107-8), so progress is saved after the step (AC-107-02).
 *
 * Failure handling (AC 3): a create `400` renders its field-level `errors`
 * under the matching inputs; a `409` duplicate name renders its message on
 * the name field; a network/other failure toasts the sanitized message with
 * the form values preserved (resubmit is the retry). A progress-save failure
 * after a successful create shows an inline error with a retry that
 * re-saves the progress **only** — the semester already exists, so it must
 * never be re-created (a resubmit would 409).
 */
export function Step2Semester() {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The semester created by the last submit whose progress save failed — the
  // retry re-dispatches the progress save with this id (idempotent).
  const [pendingSemesterId, setPendingSemesterId] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: { name: '', startDate: '', endDate: '' },
  });

  // While the progress-save retry is offered the form is frozen: editing and
  // resubmitting would re-create the semester (409 duplicate name).
  const frozen = pendingSemesterId !== null;
  const busy = isSubmitting || isRetrying || frozen;

  const retryProgressSave = async () => {
    if (!pendingSemesterId) return;
    setIsRetrying(true);
    try {
      // The semester already exists — only the progress save is retried.
      // `dispatch` of an async thunk resolves to the final action (it does
      // not throw on rejection), so the result is matched explicitly.
      const result = await dispatch(advanceOnboarding({ step: 3, semesterId: pendingSemesterId }));
      // Success: the slice step becomes 3 (the shell re-renders step 3) and
      // the error clears. On a failed retry the marker stays — the student
      // can retry again (the shell keeps displaying the slice error).
      if (!advanceOnboarding.rejected.match(result)) {
        setPendingSemesterId(null);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCreateError = (err: unknown) => {
    // The shared `httpClient` interceptor rejects with `{ ...axiosError,
    // message }` — the parsed body lives at `response.data`, so extract it
    // first and feed the `ApiError` (already shaped like the 400 body) to
    // the field-error helper.
    const apiError = extractApiError(err);
    if (apiError && apiError.statusCode === 409) {
      // Duplicate name for this student — actionable on the name field.
      setError('name', { type: 'server', message: apiErrorMessage(apiError) });
      return;
    }
    if (apiError && apiError.statusCode === 400) {
      const nameMessage = getFieldError(apiError, 'name');
      const startDateMessage = getFieldError(apiError, 'startDate');
      const endDateMessage = getFieldError(apiError, 'endDate');
      if (nameMessage) {
        setError('name', { type: 'server', message: nameMessage });
      }
      if (startDateMessage) {
        setError('startDate', { type: 'server', message: startDateMessage });
      }
      if (endDateMessage) {
        setError('endDate', { type: 'server', message: endDateMessage });
      }
      // Field-level feedback replaces the toast to avoid duplication.
      if (!nameMessage && !startDateMessage && !endDateMessage) {
        toast.error(apiErrorMessage(apiError));
      }
      return;
    }
    // Network or other failure — actionable message; the form keeps its
    // values and the submit button re-enables (resubmit is the retry).
    toast.error(getErrorMessage(err) || 'We could not save your semester. Try again.');
  };

  const onSubmit = async (data: Step2FormData) => {
    setIsSubmitting(true);
    try {
      // AC-2: create the semester, then save the progress with the created
      // id (persisted for step-3 resume, D107-8).
      const semester = await createSemester({
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
      });
      setPendingSemesterId(semester.id);
      // `dispatch` of an async thunk resolves to the final action (it does
      // not throw on rejection), so the result is matched explicitly.
      const result = await dispatch(advanceOnboarding({ step: 3, semesterId: semester.id }));
      if (advanceOnboarding.rejected.match(result)) {
        // The slice records the actionable error the shell displays; keep the
        // pending marker so the inline retry below re-saves the progress only
        // (the semester is never re-created).
        return;
      }
      // Success: the slice step becomes 3 and the shell re-renders step 3
      // (the announced step line is the success state).
      setPendingSemesterId(null);
    } catch (err: unknown) {
      handleCreateError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Semester name"
          placeholder="Fall 2026"
          error={errors.name?.message}
          disabled={busy}
          {...register('name')}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Start date"
            type="date"
            error={errors.startDate?.message}
            disabled={busy}
            {...register('startDate')}
          />
          <Input
            label="End date"
            type="date"
            error={errors.endDate?.message}
            disabled={busy}
            {...register('endDate')}
          />
        </div>
      </div>

      {frozen && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm text-red-700">
            Your semester was saved, but we couldn&apos;t save your progress. Please try again.
          </p>
          <Button type="button" onClick={() => void retryProgressSave()} isLoading={isRetrying}>
            Retry saving your progress
          </Button>
        </div>
      )}

      <div className="flex flex-col-reverse gap-4 sm:flex-row">
        <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={frozen}>
          Save and continue
        </Button>
      </div>
    </form>
  );
}

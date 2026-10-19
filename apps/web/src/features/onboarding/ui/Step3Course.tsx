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
import { createCourse } from '@/entities/course/api/courseApi';
// RD7: sanctioned features → app import for typed store hooks
// eslint-disable-next-line import/no-restricted-paths
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { completeOnboarding, selectOnboarding } from '../model/onboardingSlice';

/**
 * Validation mirrors the SP-107B backend rules for `POST /courses`:
 * code non-empty after trim, ≤ 20 chars; name non-empty after trim,
 * ≤ 100 chars (the backend re-validates, AC-107-07).
 */
const step3Schema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Course code is required')
    .max(20, 'Course code must be 20 characters or fewer'),
  name: z
    .string()
    .trim()
    .min(1, 'Course name is required')
    .max(100, 'Course name must be 100 characters or fewer'),
});

type Step3FormData = z.infer<typeof step3Schema>;

/**
 * Wizard step 3 — optional first course (SP-107E).
 *
 * The step is clearly optional (AC-107-07): a visible "This step is optional"
 * label plus a "Finish without a course" button that records terminal
 * completion (`PATCH /onboarding { completed: true }`) **without** creating
 * any course. The other path is the course form (code + name) attached to the
 * onboarding semester (D107-8, read from the onboarding slice — read-only
 * context line, no semester picker in M1); on `201` the onboarding is
 * recorded complete. Either way the slice's `completed` flips and the page
 * redirects to `/dashboard` (AC-107-05; the redirect itself is SP-107C's).
 *
 * Failure handling (AC 4): a create `400` renders its field-level `errors`
 * under the matching inputs; a `409` duplicate code renders its message on
 * the code field; a `404` (the semester vanished between load and submit)
 * renders an actionable message offering "Finish without a course" and
 * switches the context to the no-semester variant so a resubmit omits the
 * stale `semesterId` (D107-8: create without a semester); a network failure
 * toasts the sanitized message with the form values preserved (resubmit is
 * the retry). A completion-PATCH failure after a successful create freezes
 * the form and offers an inline retry that re-dispatches **only** the
 * completion write (the course already exists — a resubmit would 409 on the
 * duplicate code), mirroring the SP-107D progress-save retry.
 */
export function Step3Course() {
  const dispatch = useAppDispatch();
  const onboarding = useAppSelector(selectOnboarding);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  // The course created by the last submit whose completion write failed —
  // the retry re-dispatches the completion write only (the course exists).
  const [pendingCompletion, setPendingCompletion] = useState(false);
  // Set when the create 404'd (the semester vanished between load and
  // submit): the context switches to the no-semester variant and a resubmit
  // omits the stale semesterId (D107-8).
  const [semesterUnavailable, setSemesterUnavailable] = useState(false);

  const semesterId = onboarding.semesterId;
  const attached = semesterId !== null && !semesterUnavailable;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<Step3FormData>({
    resolver: zodResolver(step3Schema),
    defaultValues: { code: '', name: '' },
  });

  // While the completion write is offered/retrying, the form is frozen:
  // editing and resubmitting would re-create the course (409 duplicate code).
  const frozen = pendingCompletion;
  const busy = isSubmitting || isFinishing || frozen;

  const retryCompletion = async () => {
    setIsFinishing(true);
    try {
      // The course already exists — only the completion write is retried.
      // `dispatch` of an async thunk resolves to the final action (it does
      // not throw on rejection), so the result is matched explicitly.
      const result = await dispatch(completeOnboarding());
      // Success: the slice's `completed` flips (the page redirects to
      // /dashboard) and the error clears. On a failed retry the marker stays
      // — the student can retry again (the shell keeps displaying the error).
      if (!completeOnboarding.rejected.match(result)) {
        setPendingCompletion(false);
      }
    } finally {
      setIsFinishing(false);
    }
  };

  const handleCreateError = (err: unknown) => {
    // The shared `httpClient` interceptor rejects with `{ ...axiosError,
    // message }` — the parsed body lives at `response.data`, so extract it
    // first and feed the `ApiError` (already shaped like the 400 body) to
    // the field-error helper.
    const apiError = extractApiError(err);
    if (apiError && apiError.statusCode === 404) {
      // The semester vanished between load and submit (D107-8 edge) — the
      // uniform 404 is indistinguishable from "another student's", so the
      // actionable recovery is offered, not the cause. The context switches
      // to the no-semester variant and a resubmit omits the stale id. An
      // inline alert (not a transient toast) keeps the message visible while
      // the student chooses a path.
      setSemesterUnavailable(true);
      return;
    }
    if (apiError && apiError.statusCode === 409) {
      // Duplicate code for this student — actionable on the code field.
      setError('code', { type: 'server', message: apiErrorMessage(apiError) });
      return;
    }
    if (apiError && apiError.statusCode === 400) {
      const codeMessage = getFieldError(apiError, 'code');
      const nameMessage = getFieldError(apiError, 'name');
      if (codeMessage) {
        setError('code', { type: 'server', message: codeMessage });
      }
      if (nameMessage) {
        setError('name', { type: 'server', message: nameMessage });
      }
      // Field-level feedback replaces the toast to avoid duplication.
      if (!codeMessage && !nameMessage) {
        toast.error(apiErrorMessage(apiError));
      }
      return;
    }
    // Network or other failure — actionable message; the form keeps its
    // values and the submit button re-enables (resubmit is the retry).
    toast.error(getErrorMessage(err) || 'We could not add your course. Try again.');
  };

  const onSubmit = async (data: Step3FormData) => {
    setIsSubmitting(true);
    try {
      // AC-3: create the course attached to the onboarding semester
      // (omitted when the state's semesterId is null or the semester
      // vanished, D107-8), then record terminal completion.
      await createCourse({
        code: data.code,
        name: data.name,
        semesterId: attached ? semesterId : null,
      });
      setPendingCompletion(true);
      // `dispatch` of an async thunk resolves to the final action (it does
      // not throw on rejection), so the result is matched explicitly.
      const result = await dispatch(completeOnboarding());
      if (completeOnboarding.rejected.match(result)) {
        // The slice records the actionable error the shell displays; keep
        // the pending marker so the inline retry below re-sends only the
        // completion write (the course is never re-created).
        return;
      }
      // Success: the slice's `completed` flips and the page redirects to
      // /dashboard (the terminal state is SP-107C's redirect).
      setPendingCompletion(false);
    } catch (err: unknown) {
      handleCreateError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // AC-1: the primary completion path — records terminal completion without
  // creating any course. The slice's `completed` flip drives the page
  // redirect; a failed write records the error the shell displays and the
  // button re-enables (the click is the retry — the write is idempotent).
  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      await dispatch(completeOnboarding());
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        {/* AC-1: the step is clearly optional. */}
        <p className="text-sm font-medium text-secondary-600">This step is optional</p>
        {/* D107-8: the onboarding semester is the read-only attachment
            context (no semester picker in M1); the line adjusts when the
            state's semesterId is null or the semester vanished. */}
        <p className="text-sm text-secondary-500">
          {attached
            ? 'Adding to your first semester'
            : 'Your first semester is no longer available — the course will be added without a semester.'}
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Course code"
          placeholder="CS101"
          error={errors.code?.message}
          disabled={busy}
          {...register('code')}
        />
        <Input
          label="Course name"
          placeholder="Intro to Computer Science"
          error={errors.name?.message}
          disabled={busy}
          {...register('name')}
        />
      </div>

      {semesterUnavailable && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm text-red-700">
            Your first semester is no longer available, so the course could not be added. You can
            still finish without a course, or resubmit to add it without a semester.
          </p>
        </div>
      )}

      {frozen && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm text-red-700">
            Your course was added, but we couldn&apos;t finish your setup. Please try again.
          </p>
          <Button type="button" onClick={() => void retryCompletion()} isLoading={isFinishing}>
            Retry finishing
          </Button>
        </div>
      )}

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Both exit paths are mutually exclusive while either write is in
            flight (`busy`): a racing second completion write would 409 on
            the terminal state (or create an unneeded course). */}
        <Button
          type="button"
          variant="ghost"
          onClick={() => void handleFinish()}
          isLoading={isFinishing}
          disabled={busy}
        >
          Finish without a course
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={busy}>
          Add course
        </Button>
      </div>
    </form>
  );
}

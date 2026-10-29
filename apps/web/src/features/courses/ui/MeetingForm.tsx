import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import {
  apiErrorMessage,
  extractApiError,
  getFieldError,
  getErrorMessage,
} from '@/shared/lib/errors';
import { createMeeting, updateMeeting } from '@/entities/course/api/courseApi';
import type { ClassMeeting } from '@/shared/types/academic';
import { formatMeetingLabel } from './meetingLabel';

/** The full weekday names the Day select offers (Sun–Sat, D112-1). */
const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;

/** The create-mode default day (recorded decision): Monday — the natural class day. */
const DEFAULT_DAY_OF_WEEK = 1;

/** `HH:mm` 24-hour format with hour 00–23 / minute 00–59 (mirrors the backend, DoD 2). */
const HH_MM = /^\d{2}:\d{2}$/;

function isValidTime(value: string): boolean {
  if (!HH_MM.test(value)) return false;
  return Number(value.slice(0, 2)) <= 23 && Number(value.slice(3, 5)) <= 59;
}

/**
 * Client validation mirrors the SP-112A backend rules (DoD 2 — the backend
 * re-validates, so the client is a convenience, never the authority):
 *
 * - `dayOfWeek`: integer 0–6 (Sunday=0 … Saturday=6, D112-1).
 * - `startTime` / `endTime`: required `HH:mm` 24-hour times.
 * - `endTime` strictly after `startTime` on the same day (no midnight wrap) —
 *   the inline error under the end field (ticket AC 3).
 */
const meetingFormSchema = z
  .object({
    dayOfWeek: z
      .number()
      .int()
      .min(0, 'Day must be between Sunday and Saturday')
      .max(6, 'Day must be between Sunday and Saturday'),
    startTime: z
      .string()
      .min(1, 'Start time is required')
      .refine(isValidTime, 'Start time must be a 24-hour time (HH:mm)'),
    endTime: z
      .string()
      .min(1, 'End time is required')
      .refine(isValidTime, 'End time must be a 24-hour time (HH:mm)'),
  })
  .refine((data) => data.startTime === '' || data.endTime === '' || data.endTime > data.startTime, {
    message: 'End time must be after the start time.',
    path: ['endTime'],
  });

type MeetingFormData = z.infer<typeof meetingFormSchema>;

/** The form fields the backend 400 `errors` map can name. */
const FIELD_ERROR_FIELDS = ['dayOfWeek', 'startTime', 'endTime'] as const;

export interface MeetingFormProps {
  /** The course the meeting belongs to (the nested route's `:id`). */
  courseId: string;
  /**
   * Edit mode: the meeting to pre-fill → `PATCH /courses/:id/meetings/:meetingId`.
   * Omitted in create mode → `POST /courses/:id/meetings`.
   */
  meeting?: ClassMeeting;
  /** Called on success with the action that happened (the page announces + refetches). */
  onSuccess: (action: 'created' | 'updated') => void;
  /** Close the dialog without a request. */
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Add/edit form for a recurring class meeting (SP-112B, AC 3) — a **dialog**
 * (D112B-3, the `CourseForm` pattern): focus trap, Escape closes, focus
 * returns to the trigger.  Fields: Day (native `Select`, Sun–Sat), Start time
 * and End time (`Input type="time"`, `HH:mm`).
 *
 * Failure handling (D112B-8): a `400` renders its field-level `errors` map
 * under the matching inputs; a `409` (slot already taken) renders the API
 * message as a form-level alert; a `404` (the course is gone) renders a
 * form-level alert with a **Back to courses** link; any other failure toasts
 * the sanitized message with the form values preserved (resubmit is the
 * retry).  The submit button is `isLoading` (disabled) for the whole flight —
 * no duplicate submission.
 */
export function MeetingForm({ courseId, meeting, onSuccess, onClose }: MeetingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<{ message: string; isNotFound: boolean } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<MeetingFormData>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      dayOfWeek: meeting?.dayOfWeek ?? DEFAULT_DAY_OF_WEEK,
      startTime: meeting?.startTime ?? '',
      endTime: meeting?.endTime ?? '',
    },
  });

  // Focus management (the CourseForm/DeleteSemesterDialog pattern): on open
  // the dialog takes focus (the first focusable is the day select) and focus
  // is trapped (Tab/Shift+Tab cycle within; Escape closes); on close focus
  // returns to the trigger that opened the dialog.
  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? dialogRef.current)?.focus();
    return () => {
      restoreFocusRef.current?.focus();
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (isSubmitting) return; // frozen while the request is in flight
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute('disabled')
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // Escape/Tab handling is attached imperatively (not as a JSX handler):
  // focus is trapped inside the dialog, so a keydown listener on the dialog
  // element sees every key press.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
    };
  });

  const handleApiError = (err: unknown) => {
    const apiError = extractApiError(err);
    if (apiError && apiError.statusCode === 400) {
      // Field-level feedback under the matching inputs replaces the toast.
      let mapped = false;
      for (const field of FIELD_ERROR_FIELDS) {
        const message = getFieldError(apiError, field);
        if (message) {
          setError(field, { type: 'server', message });
          mapped = true;
        }
      }
      if (!mapped) {
        toast.error(apiErrorMessage(apiError));
      }
      return;
    }
    if (apiError && apiError.statusCode === 409) {
      // Slot already taken (P2002) — actionable form-level message.
      setFormError({ message: apiErrorMessage(apiError), isNotFound: false });
      return;
    }
    if (apiError && apiError.statusCode === 404) {
      // Uniform 404: the course is missing or not the student's (no existence
      // oracle) — the form cannot recover in place, so the recovery is the
      // back link.
      setFormError({
        message: `${apiErrorMessage(apiError)} — this course may no longer exist.`,
        isNotFound: true,
      });
      return;
    }
    // Network or other failure — actionable message; the form keeps its
    // values and the submit button re-enables (resubmit is the retry).
    toast.error(getErrorMessage(err) || 'We could not save the meeting. Try again.');
  };

  const onSubmit = async (data: MeetingFormData) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
      };
      if (meeting) {
        await updateMeeting(courseId, meeting.id, payload);
      } else {
        await createMeeting(courseId, payload);
      }
      onSuccess(meeting ? 'updated' : 'created');
    } catch (err: unknown) {
      handleApiError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop: click closes without a request (frozen while submitting). */}
      <div
        className="absolute inset-0 bg-text/50"
        aria-hidden="true"
        onClick={isSubmitting ? undefined : onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-form-title"
        tabIndex={-1}
        className="card relative max-h-[90vh] w-full max-w-md overflow-y-auto"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <h2 id="meeting-form-title" className="text-lg font-semibold text-text">
            {meeting ? `Edit ${formatMeetingLabel(meeting)}` : 'Add a meeting'}
          </h2>

          <div className="space-y-4">
            <Select
              label="Day"
              error={errors.dayOfWeek?.message}
              disabled={isSubmitting}
              {...register('dayOfWeek', { valueAsNumber: true })}
            >
              {WEEKDAY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Start time"
                type="time"
                error={errors.startTime?.message}
                disabled={isSubmitting}
                {...register('startTime')}
              />
              <Input
                label="End time"
                type="time"
                error={errors.endTime?.message}
                disabled={isSubmitting}
                {...register('endTime')}
              />
            </div>
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
            >
              <p>{formError.message}</p>
              {formError.isNotFound && (
                <Link
                  to="/courses"
                  className="mt-2 inline-block font-medium text-accent hover:underline"
                >
                  Back to courses
                </Link>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              aria-label={meeting ? 'Save changes' : 'Create meeting'}
            >
              {meeting ? 'Save changes' : 'Create meeting'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

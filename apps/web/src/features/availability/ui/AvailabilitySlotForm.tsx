import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Ban, CheckCircle2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import {
  apiErrorMessage,
  extractApiError,
  getFieldError,
  getErrorMessage,
} from '@/shared/lib/errors';
import {
  createAvailabilitySlot,
  updateAvailabilitySlot,
} from '@/entities/availability/api/availabilityApi';
import type { AvailabilitySlot } from '@/entities/availability/model/types';
import { formatSlotName } from './slotLabel';

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

/** The create-mode default day (D128B-5 — the MeetingForm recorded default): Monday. */
const DEFAULT_DAY_OF_WEEK = 1;

/** `HH:mm` 24-hour format with hour 00–23 / minute 00–59 (mirrors the API, DoD 2). */
const HH_MM = /^\d{2}:\d{2}$/;

function isValidTime(value: string): boolean {
  if (!HH_MM.test(value)) return false;
  return Number(value.slice(0, 2)) <= 23 && Number(value.slice(3, 5)) <= 59;
}

/**
 * Client validation mirrors the SP-128A backend rules (DoD 2 — the backend
 * re-validates, so the client is a convenience, never the authority):
 *
 * - `dayOfWeek`: integer 0–6 (Sunday=0 … Saturday=6, D112-1); the day select
 *   makes out-of-range unselectable, so no client message is needed for the
 *   0–6 rule beyond the required check (D128B-7).
 * - `startTime` / `endTime`: required `HH:mm` 24-hour times.
 * - `endTime` strictly after `startTime` on the same day (no midnight wrap) —
 *   the inline error under the End field (D128B-7).
 * - `kind` is the form's radio pair ('available' | 'blocked', D128B-6);
 *   it is always present, so no validation message exists for it — the
 *   submitted `isAvailable` is `kind === 'available'`.
 */
const slotFormSchema = z
  .object({
    kind: z.enum(['available', 'blocked']),
    dayOfWeek: z
      .number({ invalid_type_error: 'Day is required' })
      .int('Day must be between Sunday and Saturday')
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

type SlotFormData = z.infer<typeof slotFormSchema>;

/** The form fields the API 400 `errors` map can name (D128B-8; `kind` maps to `isAvailable`). */
const FIELD_ERROR_FIELDS = ['dayOfWeek', 'startTime', 'endTime'] as const;

export interface AvailabilitySlotFormProps {
  /**
   * Edit mode: the slot to pre-fill → `PATCH /availability-slots/:id`.
   * Omitted in create mode → `POST /availability-slots`.
   */
  slot?: AvailabilitySlot;
  /**
   * Called on success with the action that happened and the row the API
   * returned (the page announces — kind-specific on add — and refetches).
   */
  onSuccess: (action: 'created' | 'updated', slot: AvailabilitySlot) => void;
  /**
   * Close the dialog without a request. `requestRefetch: true` asks the page
   * to re-read the list — the 404 path (D128B-8: a slot that vanished, the
   * dialog cannot recover in place, so cancelling re-reads the truth).
   */
  onClose: (options?: { requestRefetch?: boolean }) => void;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The kind radio pair's choices (D128B-6): labels one word more explicit
 * than the calendar badges so the setting's meaning survives without the
 * calendar context; the sub-captions state the effect on the weekly grid.
 */
const KIND_OPTIONS = [
  {
    value: 'available' as const,
    label: 'Available window',
    caption: 'You can study then',
    icon: CheckCircle2,
  },
  {
    value: 'blocked' as const,
    label: 'Blocked time',
    caption: 'You are unavailable then',
    icon: Ban,
  },
] as const;

/**
 * Add/edit form for a recurring availability slot (SP-128B, AC 2–3) — a
 * **dialog** (D128B-5, the `MeetingForm` pattern): focus trap, Escape closes,
 * focus returns to the trigger, backdrop click closes (frozen while
 * submitting), duplicate-submission prevention via `isLoading`.  Fields:
 * Kind (the segmented radio pair, D128B-6), Day (`Select`, Sun–Sat full
 * names, default Monday), Start/End time (`Input type="time"`, side by side
 * on `sm:`).
 *
 * Failure handling (D128B-8): a `400` renders its field-level `errors` map
 * under the matching inputs (input preserved, nothing written); a `409`
 * duplicate renders the API's message as a form-level alert; a `404` during
 * edit (uniform — the slot is gone or foreign) renders the form-level alert
 * and cancelling re-reads the list; any other failure toasts the sanitized
 * message with the form values preserved (resubmit is the retry).
 */
export function AvailabilitySlotForm({ slot, onSuccess, onClose }: AvailabilitySlotFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<{ message: string; isNotFound: boolean } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<SlotFormData>({
    resolver: zodResolver(slotFormSchema),
    defaultValues: {
      kind: slot ? (slot.isAvailable ? 'available' : 'blocked') : 'available',
      dayOfWeek: slot?.dayOfWeek ?? DEFAULT_DAY_OF_WEEK,
      startTime: slot?.startTime ?? '',
      endTime: slot?.endTime ?? '',
    },
  });

  // The segmented pair's selected state follows the form value (Tailwind 3.3
  // has no `has-[:checked]` variant, so `watch` drives the chips).
  const selectedKind = watch('kind');

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  /** The 404 alert is showing — a cancel should also refresh the list. */
  const notFoundRef = useRef(false);

  const requestClose = () => {
    if (isSubmitting) return; // frozen while the request is in flight (D128B-5)
    closeRef.current(notFoundRef.current ? { requestRefetch: true } : undefined);
  };

  // Focus management (the MeetingForm/DeleteSemesterDialog pattern): on open
  // the dialog takes focus (the first focusable is the kind radio pair) and
  // focus is trapped (Tab/Shift+Tab cycle within; Escape closes); on close
  // focus returns to the trigger that opened the dialog.
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
      requestClose();
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
      // Duplicate (userId, dayOfWeek, startTime) — actionable form-level
      // message with the API's wording ("…already exists…"), input preserved.
      setFormError({ message: apiErrorMessage(apiError), isNotFound: false });
      return;
    }
    if (apiError && apiError.statusCode === 404) {
      // Uniform 404 (edit): the slot is gone or foreign — no existence
      // oracle. The dialog cannot recover in place; the alert says so and
      // the cancel re-reads the list (D128B-8).
      notFoundRef.current = true;
      setFormError({
        message: `${apiErrorMessage(apiError)} — this time slot may no longer exist.`,
        isNotFound: true,
      });
      return;
    }
    // Network or other failure — actionable message; the form keeps its
    // values and the submit button re-enables (resubmit is the retry).
    toast.error(getErrorMessage(err) || 'We could not save the time slot. Try again.');
  };

  const onSubmit = async (data: SlotFormData) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        isAvailable: data.kind === 'available',
      };
      let saved: AvailabilitySlot;
      if (slot) {
        saved = await updateAvailabilitySlot(slot.id, payload);
      } else {
        saved = await createAvailabilitySlot(payload);
      }
      onSuccess(slot ? 'updated' : 'created', saved);
    } catch (err: unknown) {
      handleApiError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop: click closes without a request (frozen while submitting). */}
      <div className="absolute inset-0 bg-text/50" aria-hidden="true" onClick={requestClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slot-form-title"
        tabIndex={-1}
        className="card relative max-h-[90vh] w-full max-w-md overflow-y-auto overflow-x-hidden p-6"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <h2 id="slot-form-title" className="text-lg font-semibold text-text">
            {slot ? `Edit ${formatSlotName(slot)}` : 'Add a time slot'}
          </h2>

          <div className="space-y-4">
            {/* Kind (D128B-6): a labeled radiogroup of two segmented cards;
                native radios — one tabstop into the group, arrow keys move
                the selection (AC 8), and the checked radio is the create-mode
                default "Available window". `aria-label` keeps the radio's
                name exactly the option label (the caption stays visual). */}
            <div>
              <span id="slot-kind-label" className="mb-2 block text-sm font-medium text-text">
                Kind
              </span>
              <div
                role="radiogroup"
                aria-labelledby="slot-kind-label"
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                {KIND_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const checked = selectedKind === option.value;
                  return (
                    <label
                      key={option.value}
                      className={clsx(
                        'flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors duration-150',
                        'focus-within:outline-none focus-within:ring-2 focus-within:ring-accent',
                        checked
                          ? 'border-accent bg-accent/10'
                          : 'border-border bg-surface hover:border-border-strong',
                        isSubmitting && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        aria-label={option.label}
                        checked={selectedKind === option.value}
                        // Explicit size + resets: the global base rule
                        // `input { @apply w-full px-4 py-2 border … }`
                        // (index.css) would otherwise stretch this radio to
                        // the full card width (F-B-6: the text beside it
                        // collapsed and the card content overflowed).
                        className="mt-1 h-4 w-4 shrink-0 p-0 border-0 bg-transparent"
                        disabled={isSubmitting}
                        {...register('kind')}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-text">
                          <Icon aria-hidden size={14} className="shrink-0 text-text-muted" />
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-text-muted">
                          {option.caption}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

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
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={requestClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              aria-label={slot ? 'Save changes' : 'Create time slot'}
            >
              {slot ? 'Save changes' : 'Create time slot'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

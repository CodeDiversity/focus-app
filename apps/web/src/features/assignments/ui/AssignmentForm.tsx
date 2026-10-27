import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { createAssignment, updateAssignment } from '@/entities/assignment/api/assignmentApi';
import type { AssignmentType } from '@/shared/types/academic';
import type { AssignmentInteractionItem } from '../model/types';
import { apiErrorMessage, extractApiError, getFieldError } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';

/** Parse date parts in local time, never as a UTC date-only string (D113B-3). */
function localDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  // Date's multi-argument constructor treats 0–99 as 1900–1999.
  if (year < 100) date.setFullYear(year);
  return date;
}

/** Convert ISO date or YYYY-MM-DD to local YYYY-MM-DD for native date input (D114E-5). */
function toLocalDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer'),
  dueDate: z
    .string()
    .refine(
      (value) =>
        value === '' ||
        (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(localDate(value).getTime())),
      'Enter a valid due date'
    ),
  estimatedHours: z
    .string()
    .refine(
      (value) =>
        value === '' ||
        (Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 1000),
      'Estimated duration must be greater than 0 and at most 1000 hours'
    ),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  /** `''` is the unset state on the wire it is omitted entirely (SP-115, D115-1). */
  type: z.union([z.enum(['HOMEWORK', 'PAPER', 'PROJECT', 'QUIZ', 'EXAM']), z.literal('')]),
  description: z.string().max(2000, 'Description must be 2000 characters or fewer').optional(),
});
type FormData = z.infer<typeof schema>;
const FIELDS = ['title', 'dueDate', 'estimatedHours', 'priority', 'type', 'description'] as const;
/** The five stored type identifiers in the D115-1 register order (option order). */
const ASSIGNMENT_TYPES: AssignmentType[] = ['HOMEWORK', 'PAPER', 'PROJECT', 'QUIZ', 'EXAM'];
/** Title-cased select option copy; the `value`s stay the API wire format (D115-1). */
const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  HOMEWORK: 'Homework',
  PAPER: 'Paper',
  PROJECT: 'Project',
  QUIZ: 'Quiz',
  EXAM: 'Exam',
};
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface AssignmentFormProps {
  courseId: string;
  assignment?: AssignmentInteractionItem;
  onSuccess: () => void;
  onClose: () => void;
}

/**
 * Quick creation or editing in course context; backend validation remains authoritative.
 * Supports create and edit modes (D114E-1, D114E-2, D114E-6).
 */
export function AssignmentForm({ courseId, assignment, onSuccess, onClose }: AssignmentFormProps) {
  const isEdit = Boolean(assignment);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: assignment?.title ?? '',
      dueDate: toLocalDateInputValue(assignment?.dueDate),
      estimatedHours: assignment?.estimatedHours != null ? String(assignment.estimatedHours) : '',
      priority: assignment?.priority ?? 'MEDIUM',
      type: assignment?.type ?? '',
      description: assignment?.description ?? '',
    },
  });

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => {
      trigger?.focus();
    };
  }, []);

  useEffect(() => {
    // Disabled controls cannot retain keyboard focus reliably across browsers.
    if (isSubmitting) dialogRef.current?.focus();
  }, [isSubmitting]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        event.stopPropagation();
        onClose();
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled')
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', onKeyDown);
    return () => dialog.removeEventListener('keydown', onKeyDown);
  }, [isSubmitting, onClose]);

  const onSubmit = async (data: FormData) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (assignment) {
        await updateAssignment(assignment.id, {
          title: data.title,
          priority: data.priority,
          dueDate: data.dueDate ? localDate(data.dueDate).toISOString() : null,
          estimatedHours: data.estimatedHours ? Number(data.estimatedHours) : null,
          // D115-3: a falsy (unset) select sends no key — never `type: null`.
          ...(data.type ? { type: data.type } : {}),
          description: data.description ?? '',
        });
      } else {
        await createAssignment({
          title: data.title,
          courseId,
          priority: data.priority,
          ...(data.dueDate ? { dueDate: localDate(data.dueDate).toISOString() } : {}),
          ...(data.estimatedHours ? { estimatedHours: Number(data.estimatedHours) } : {}),
          ...(data.type ? { type: data.type } : {}),
          ...(data.description ? { description: data.description } : {}),
        });
      }
      onSuccess();
    } catch (err: unknown) {
      const apiError = extractApiError(err);
      if (apiError?.statusCode === 400) {
        let mapped = false;
        for (const field of FIELDS) {
          const message = getFieldError(apiError, field);
          if (message) {
            setError(field, { type: 'server', message });
            mapped = true;
          }
        }
        if (!mapped) toast.error(apiErrorMessage(apiError));
      } else if (apiError?.statusCode === 404) {
        setFormError(
          isEdit
            ? 'Resource not found — this course or assignment may no longer exist.'
            : `${apiErrorMessage(apiError)} — this course may no longer exist.`
        );
      } else {
        toast.error('We could not save the assignment. Try again.');
      }
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-secondary-900/50"
        aria-hidden="true"
        onClick={isSubmitting ? undefined : onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assignment-form-title"
        aria-busy={isSubmitting}
        tabIndex={-1}
        className="card relative max-h-[90vh] w-full max-w-md overflow-y-auto"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <h2 id="assignment-form-title" className="text-lg font-semibold text-secondary-900">
            {isEdit ? 'Edit assignment' : 'Add an assignment'}
          </h2>
          <div className="space-y-4">
            <Input
              label="Title"
              placeholder="Problem Set 4"
              required
              error={errors.title?.message}
              disabled={isSubmitting}
              {...register('title')}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Due date"
                type="date"
                hint={
                  isEdit
                    ? 'Optional — leave blank to keep the current due date.'
                    : 'Optional — leave blank for no due date.'
                }
                error={errors.dueDate?.message}
                disabled={isSubmitting}
                {...register('dueDate')}
              />
              <Input
                label="Estimated duration (hours)"
                type="number"
                step="any"
                hint={isEdit ? 'Optional — leave blank to keep the current duration.' : 'Optional'}
                error={errors.estimatedHours?.message}
                disabled={isSubmitting}
                {...register('estimatedHours')}
              />
            </div>
            {/*
             * The classification row (SP-115, refined 2026-10-25): scholarship
             * first, then how the student classifies work — type left of
             * priority. Tab order is the DOM order, so the existing trap
             * needs no change.
             */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Type"
                hint={
                  isEdit && assignment?.type
                    ? 'Pick a different value to change the type.'
                    : 'Optional.'
                }
                error={errors.type?.message}
                disabled={isSubmitting}
                {...register('type')}
              >
                {/* "No type" names the resulting unset state — it is never a
                    clear affordance: the API has no null-clear (D115-3), so
                    the option is absent when a type is already stored. */}
                {(!isEdit || assignment?.type === null) && <option value="">No type</option>}
                {ASSIGNMENT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {ASSIGNMENT_TYPE_LABELS[value]}
                  </option>
                ))}
              </Select>
              <Select
                label="Priority"
                hint={
                  isEdit
                    ? 'Pick a different value to change the priority.'
                    : 'Optional — defaults to Medium'
                }
                error={errors.priority?.message}
                disabled={isSubmitting}
                {...register('priority')}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </div>
            <div className="w-full">
              <label
                htmlFor="assignment-description"
                className="block mb-2 text-sm font-medium text-secondary-700"
              >
                Description
              </label>
              <textarea
                id="assignment-description"
                rows={3}
                maxLength={2000}
                aria-invalid={errors.description?.message ? true : undefined}
                aria-describedby={
                  errors.description?.message
                    ? 'assignment-description-error'
                    : 'assignment-description-hint'
                }
                placeholder="Optional notes or instructions"
                className={clsx(
                  'w-full px-4 py-2 border rounded-lg bg-white text-secondary-900 placeholder-secondary-400',
                  'focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors duration-200',
                  errors.description?.message
                    ? 'border-red-500 text-red-900 placeholder-red-700'
                    : 'border-secondary-300',
                  isSubmitting && 'opacity-50 cursor-not-allowed bg-secondary-50'
                )}
                disabled={isSubmitting}
                {...register('description')}
              />
              {errors.description?.message && (
                <p id="assignment-description-error" className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
              {!errors.description?.message && (
                <p id="assignment-description-hint" className="mt-1 text-sm text-secondary-500">
                  {isEdit
                    ? 'Optional — up to 2000 characters. Leave blank to clear.'
                    : 'Optional — up to 2000 characters.'}
                </p>
              )}
            </div>
          </div>
          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <p>{formError}</p>
              <Link
                to="/courses"
                className="mt-2 inline-block font-medium text-primary-600 hover:underline"
              >
                Back to courses
              </Link>
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
              aria-label={isEdit ? 'Save changes' : 'Create assignment'}
            >
              {isEdit ? 'Save changes' : 'Create assignment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

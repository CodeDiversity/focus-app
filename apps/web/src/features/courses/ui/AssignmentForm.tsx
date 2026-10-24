import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { createAssignment } from '@/entities/assignment/api/assignmentApi';
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
});
type FormData = z.infer<typeof schema>;
const FIELDS = ['title', 'dueDate', 'estimatedHours', 'priority'] as const;
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface AssignmentFormProps {
  courseId: string;
  onSuccess: () => void;
  onClose: () => void;
}

/** Quick creation in course context; backend validation remains authoritative. */
export function AssignmentForm({ courseId, onSuccess, onClose }: AssignmentFormProps) {
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
    defaultValues: { title: '', dueDate: '', estimatedHours: '', priority: 'MEDIUM' },
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
      await createAssignment({
        title: data.title,
        courseId,
        priority: data.priority,
        ...(data.dueDate ? { dueDate: localDate(data.dueDate).toISOString() } : {}),
        ...(data.estimatedHours ? { estimatedHours: Number(data.estimatedHours) } : {}),
      });
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
        setFormError(`${apiErrorMessage(apiError)} — this course may no longer exist.`);
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
            Add an assignment
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
                hint="Optional — leave blank for no due date."
                error={errors.dueDate?.message}
                disabled={isSubmitting}
                {...register('dueDate')}
              />
              <Input
                label="Estimated duration (hours)"
                type="number"
                step="any"
                hint="Optional"
                error={errors.estimatedHours?.message}
                disabled={isSubmitting}
                {...register('estimatedHours')}
              />
            </div>
            <Select
              label="Priority"
              hint="Optional — defaults to Medium"
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
              aria-label="Create assignment"
            >
              Create assignment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

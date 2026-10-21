import { useEffect, useRef, useState } from 'react';
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
import {
  createCourse,
  updateCourse,
  type CourseWithSemester,
} from '@/entities/course/api/courseApi';
import type { SemesterWithCount } from '@/entities/semester/api/semesterApi';

/** The schema's default color (SP-107B) — the create form's default. */
const DEFAULT_COLOR = '#6366f1';

/**
 * Client validation mirrors the SP-111A backend field rules (DoD 2 — the
 * backend re-validates the merged values, so the client is a convenience,
 * never the authority):
 *
 * - `code`: non-empty after trim, ≤ 20 chars.
 * - `name`: non-empty after trim, ≤ 100 chars.
 * - `instructor`: optional — but **whitespace-only** is rejected (the backend
 *   trims, then 400s an empty instructor); ≤ 100 chars.
 * - `credits`: optional — numeric `0 < c ≤ 30`.
 * - `color`: optional — `#rrggbb` hex.
 * - `description`: optional — ≤ 2000 chars.
 *
 * Null-no-op semantics (F111B-1 → D111B-3): the backend `PATCH` treats an
 * explicit `null` as omitted, so a **blank** `instructor`/`credits`/`color`
 * sends `null` and keeps the stored value (the form hints "leave blank to
 * keep…" in edit mode).  `description` is the exception — an empty string
 * clears the stored description, so a blanked textarea sends `''`.
 */
const courseFormSchema = z.object({
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
  // `''` = no semester (create) — the backend 404s a semester that is
  // missing or not the student's; there is no client rule to mirror.
  semesterId: z.string(),
  instructor: z
    .string()
    .refine(
      (value) => value === '' || (value.trim().length > 0 && value.trim().length <= 100),
      'Instructor must not be empty and must be 100 characters or fewer'
    ),
  credits: z
    .string()
    .refine(
      (value) => value.trim() === '' || (Number(value) > 0 && Number(value) <= 30),
      'Credits must be greater than 0 and at most 30'
    ),
  color: z
    .string()
    .refine(
      (value) => value.trim() === '' || /^#[0-9a-fA-F]{6}$/.test(value.trim()),
      'Color must be a #rrggbb hex color'
    ),
  description: z.string().max(2000, 'Description must be 2000 characters or fewer'),
});

type CourseFormData = z.infer<typeof courseFormSchema>;

/** The form fields the backend `PATCH` 400 `errors` map can name. */
const FIELD_ERROR_FIELDS = [
  'code',
  'name',
  'instructor',
  'credits',
  'color',
  'description',
] as const;

export type CourseFormProps =
  | {
      /** Submits the existing `POST /courses` (the onboarding endpoint, SP-107B). */
      mode: 'create';
      course?: undefined;
      /** The student's own semesters for the picker (principal-scoped list). */
      semesters: SemesterWithCount[];
      /** Called with the submitted name on success (the page re-reads the list). */
      onSuccess: (name: string) => void;
      /** Close the dialog without a request. */
      onClose: () => void;
    }
  | {
      /** Pre-filled form → `PATCH /courses/:id` (the same field rules). */
      mode: 'edit';
      course: CourseWithSemester;
      semesters: SemesterWithCount[];
      onSuccess: (name: string) => void;
      onClose: () => void;
    };

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Create/edit form for a course (SP-111B, AC 3/4) — a **dialog** (D111B-2):
 * unlike the inline `SemesterForm`, it renders its own overlay and traps
 * focus (the `DeleteSemesterDialog` pattern).  Fields: `code`, `name`,
 * `semester` (optional picker — only the student's own semesters, the active
 * one marked), `instructor` (D111-1), `credits`, `color`, `description`.
 *
 * Failure handling: a `400` renders its field-level `errors` map under the
 * matching inputs; a `409` (duplicate code) and a `404` (semester) render as
 * actionable **form-level** messages (ticket AC 3); any other failure toasts
 * the sanitized message with the form values preserved (resubmit is the
 * retry).  The submit button is `isLoading` (disabled) for the whole flight —
 * no duplicate submission.
 */
export function CourseForm({ mode, course, semesters, onSuccess, onClose }: CourseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      code: course?.code ?? '',
      name: course?.name ?? '',
      semesterId: course?.semesterId ?? '',
      instructor: course?.instructor ?? '',
      credits: course?.credits != null ? String(course.credits) : '',
      color: course?.color ?? DEFAULT_COLOR,
      description: course?.description ?? '',
    },
  });

  const isEdit = mode === 'edit' && course !== undefined;
  // The backend cannot detach a course from its semester (an explicit null is
  // a no-op, F111B-1) — so "No semester" is disabled in edit mode when the
  // course is attached (D111B-3).
  const noSemesterDisabled = isEdit && course.semesterId !== null;

  // Focus management (the DeleteSemesterDialog pattern): on open the dialog
  // takes focus (the first focusable is the code input) and focus is trapped
  // (Tab/Shift+Tab cycle within; Escape closes); on close focus returns to
  // the trigger that opened the dialog.
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
      // Duplicate code for this student — actionable form-level message.
      setFormError(apiErrorMessage(apiError));
      return;
    }
    if (apiError && apiError.statusCode === 404) {
      // Uniform 404: the selected semester is missing or not the student's
      // (indistinguishable — no existence oracle).
      setFormError(
        `${apiErrorMessage(apiError)}: the selected semester may no longer exist. Choose a ` +
          'different semester (or none) and try again.'
      );
      return;
    }
    // Network or other failure — actionable message; the form keeps its
    // values and the submit button re-enables (resubmit is the retry).
    toast.error(getErrorMessage(err) || 'We could not save your course. Try again.');
  };

  const onSubmit = async (data: CourseFormData) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const code = data.code.trim();
      const name = data.name.trim();
      const instructor = data.instructor.trim();
      const credits = data.credits.trim() === '' ? null : Number(data.credits);
      const color = data.color.trim() === '' ? null : data.color.trim();
      if (mode === 'create') {
        await createCourse({
          code,
          name,
          semesterId: data.semesterId || null,
          instructor: instructor === '' ? null : instructor,
          description: data.description === '' ? null : data.description,
          credits,
          color,
        });
      } else if (course) {
        await updateCourse(course.id, {
          code,
          name,
          // The picker is prefilled with the attached semester (and "No
          // semester" is disabled then), so this round-trips the stored
          // semester or the student's new pick.
          semesterId: data.semesterId || course.semesterId || null,
          // Blank optional fields send null (the backend keeps the stored
          // value — F111B-1); a blanked description sends '' (clears).
          instructor: instructor === '' ? null : instructor,
          description: data.description,
          credits,
          color,
        });
      }
      onSuccess(name);
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
        className="absolute inset-0 bg-secondary-900/50"
        aria-hidden="true"
        onClick={isSubmitting ? undefined : onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-form-title"
        tabIndex={-1}
        className="card relative max-h-[90vh] w-full max-w-xl overflow-y-auto"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <h2 id="course-form-title" className="text-lg font-semibold text-secondary-900">
            {mode === 'create' ? 'Add a course' : `Edit ${course?.name ?? ''}`}
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Course code"
                placeholder="CS101"
                error={errors.code?.message}
                disabled={isSubmitting}
                {...register('code')}
              />
              <Input
                label="Course name"
                placeholder="Intro to Computer Science"
                error={errors.name?.message}
                disabled={isSubmitting}
                {...register('name')}
              />
            </div>

            <Select
              label="Semester"
              error={errors.semesterId?.message}
              hint={
                noSemesterDisabled
                  ? 'You can change the semester, but not remove it here.'
                  : 'Optional — leave as "No semester" if the course is unaffiliated.'
              }
              disabled={isSubmitting}
              {...register('semesterId')}
            >
              <option value="" disabled={noSemesterDisabled}>
                No semester
              </option>
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                  {semester.isActive ? ' (active)' : ''}
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Instructor"
                placeholder="Ada Lovelace"
                error={errors.instructor?.message}
                hint={
                  isEdit ? 'Optional — leave blank to keep the current instructor.' : 'Optional.'
                }
                disabled={isSubmitting}
                {...register('instructor')}
              />
              <Input
                label="Credits"
                placeholder="4"
                inputMode="decimal"
                error={errors.credits?.message}
                hint={
                  isEdit
                    ? 'Optional (0–30) — leave blank to keep the current value.'
                    : 'Optional (0–30).'
                }
                disabled={isSubmitting}
                {...register('credits')}
              />
            </div>

            <Input
              label="Color"
              placeholder="#6366f1"
              error={errors.color?.message}
              hint={
                isEdit
                  ? 'Optional (#rrggbb) — leave blank to keep the current color.'
                  : 'Optional (#rrggbb) — defaults to indigo if left blank.'
              }
              disabled={isSubmitting}
              {...register('color')}
            />

            <div className="w-full">
              <label
                htmlFor="course-description"
                className="block mb-2 text-sm font-medium text-secondary-700"
              >
                Description
              </label>
              <textarea
                id="course-description"
                rows={3}
                aria-invalid={errors.description?.message ? true : undefined}
                aria-describedby={
                  errors.description?.message ? 'course-description-error' : undefined
                }
                placeholder="Optional notes about the course"
                className={`w-full px-4 py-2 border rounded-lg bg-white text-secondary-900 placeholder-secondary-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors duration-200 ${
                  errors.description?.message
                    ? 'border-red-500 text-red-900 placeholder-red-700'
                    : 'border-secondary-300'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed bg-secondary-50' : ''}`}
                disabled={isSubmitting}
                {...register('description')}
              />
              {errors.description?.message && (
                <p id="course-description-error" className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {formError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              aria-label={mode === 'create' ? 'Create course' : 'Save changes'}
            >
              {mode === 'create' ? 'Create course' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

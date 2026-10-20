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
import {
  createSemester,
  updateSemester,
  type SemesterWithCount,
} from '@/entities/semester/api/semesterApi';

/**
 * Client validation mirrors the SP-110A backend field rules: name non-empty
 * after trim, ≤ 100 chars; both dates required; `end` strictly after `start`
 * (calendar dates compare chronologically as `yyyy-MM-dd` strings — the
 * backend re-validates the merged values, so the client is a convenience,
 * never the authority).
 *
 * The form sends `name`/`startDate`/`endDate` only — `isActive` is the
 * row-level activation action (D110-1), not a form field (D110-5).
 */
const semesterFormSchema = z
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

type SemesterFormData = z.infer<typeof semesterFormSchema>;

export type SemesterFormProps =
  | {
      /** Submits the existing `POST /semesters` (SP-107B — no new endpoint). */
      mode: 'create';
      semester?: undefined;
      /** Called with the submitted name on success (the page re-reads the list). */
      onSuccess: (name: string) => void;
      /** Close the form without a request. */
      onClose: () => void;
    }
  | {
      /** Pre-filled form → `PATCH /semesters/:id` with the same field rules. */
      mode: 'edit';
      semester: SemesterWithCount;
      /** Called with the submitted name on success (the page re-reads the list). */
      onSuccess: (name: string) => void;
      /** Close the form without a request. */
      onClose: () => void;
    };

/**
 * Create/edit form for a semester (SP-110B): name + start/end native date
 * inputs (`yyyy-MM-dd` values sent as-is — no instant/time-zone conversion,
 * D107-7).
 *
 * Failure handling: a `400` renders its field-level `errors` map under the
 * matching inputs; a `409` duplicate name renders on the name field; any
 * other failure toasts the sanitized message with the form values preserved
 * (resubmit is the retry). The submit button is `isLoading` (disabled) for
 * the whole flight — no duplicate submission.
 */
export function SemesterForm({ mode, semester, onSuccess, onClose }: SemesterFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<SemesterFormData>({
    resolver: zodResolver(semesterFormSchema),
    defaultValues: {
      name: semester?.name ?? '',
      startDate: semester?.startDate ?? '',
      endDate: semester?.endDate ?? '',
    },
  });

  const handleApiError = (err: unknown) => {
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

  const onSubmit = async (data: SemesterFormData) => {
    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        await createSemester({
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
        });
      } else if (semester) {
        // The form carries all three fields; the backend merges them onto the
        // stored row (D110-5). `isActive` is intentionally not sent.
        await updateSemester(semester.id, {
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
        });
      }
      onSuccess(data.name);
    } catch (err: unknown) {
      handleApiError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <h2 className="text-lg font-semibold text-secondary-900">
        {mode === 'create' ? 'Add a semester' : `Edit ${semester?.name ?? ''}`}
      </h2>

      <div className="space-y-4">
        <Input
          label="Semester name"
          placeholder="Fall 2026"
          error={errors.name?.message}
          disabled={isSubmitting}
          {...register('name')}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Start date"
            type="date"
            error={errors.startDate?.message}
            disabled={isSubmitting}
            {...register('startDate')}
          />
          <Input
            label="End date"
            type="date"
            error={errors.endDate?.message}
            disabled={isSubmitting}
            {...register('endDate')}
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-4 sm:flex-row">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          aria-label={mode === 'create' ? 'Create semester' : 'Save changes'}
        >
          {mode === 'create' ? 'Create semester' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

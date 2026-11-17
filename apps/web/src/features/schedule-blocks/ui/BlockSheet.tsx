import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { BookOpen, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Switch } from '@/shared/ui/Switch';
import {
  apiErrorMessage,
  extractApiError,
  getErrorMessage,
  getFieldError,
} from '@/shared/lib/errors';
import { listCourses, type CourseWithSemester } from '@/entities/course/api/courseApi';
import type { CalendarEvent } from '@/entities/calendar/model/types';
import {
  cancelOccurrence,
  createScheduleBlock,
  listScheduleBlocks,
  updateScheduleBlock,
} from '@/entities/schedule-block/api/scheduleBlockApi';
import type { ScheduleBlockKind } from '@/entities/schedule-block/model/types';
import { MIDNIGHT_HELPER } from '@/features/day-bounds/lib/midnight';
import {
  API_TO_FORM_FIELD,
  FIELD_ERROR_FIELDS,
  blockFormSchema,
  changedSeriesFields,
  defaultFormValues,
  fromBlock,
  hasNonDefaultMore,
  toPayload,
  toUpdatePayload,
  type BlockFormValues,
} from '../lib/blockForm';
import { WeekdayChips } from './WeekdayChips';
import { WeeklyChoicePrompt } from './WeeklyChoicePrompt';

/** What happened, for the page's announcement matrix (EP15G-AC4). */
export type BlockSaveAction = 'created' | 'updated' | 'this-day' | 'following' | 'this-day-partial';
export interface BlockSaveResult {
  kind: ScheduleBlockKind;
  action: BlockSaveAction;
}

export interface BlockSheetCreateProps {
  mode: 'create';
  /** Pre-filled date and times (from the page's defaults, or EP15H's drag). */
  initial: { date: string; startTime: string; endTime?: string; kind?: ScheduleBlockKind };
  block?: undefined;
}
export interface BlockSheetEditProps {
  mode: 'edit';
  initial?: undefined;
  /** The EVENT / STUDY_BLOCK occurrence being edited (carries `blockId`, `date`, `recurring`). */
  block: CalendarEvent;
}
export type BlockSheetProps = (BlockSheetCreateProps | BlockSheetEditProps) & {
  onSaved: (result: BlockSaveResult) => void;
  onClose: () => void;
};

const KIND_OPTIONS = [
  { value: 'BUSY' as const, label: 'Busy', caption: "You're not free then", icon: Briefcase },
  { value: 'STUDY' as const, label: 'Study', caption: 'Time you plan to study', icon: BookOpen },
] as const;

const ENERGY_OPTIONS = [
  { value: 'HIGH', label: 'High energy' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low energy' },
] as const;

/** D-G10 hint under the chips in edit mode. */
export const SERIES_HINT = 'Changing the days or the end date applies to this and following weeks.';
export const COURSES_FAILED_NOTE = "Couldn't load your courses — you can tie a course later.";
export const SAVE_PROMPT = 'This repeats weekly. Apply your change to:';

/** D-G7: the same Dialog becomes a bottom sheet below `sm`. */
export const BOTTOM_SHEET_CLASSES =
  'max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-w-none max-sm:rounded-b-none max-sm:max-h-[90vh] overflow-y-auto';

type CoursesState =
  | { status: 'idle' | 'loading' | 'error'; courses: CourseWithSemester[] }
  | { status: 'ready'; courses: CourseWithSemester[] };

/**
 * The one editor for events and study blocks (EP15G; D15-14). Create and
 * edit share the form; edit hides the kind (immutable, D-B1) and fetches the
 * series shape once. Saves follow AC2's wiring: a one-off patches in place;
 * a weekly item whose series fields changed saves for this and following
 * weeks with a hint (D-G10); any other weekly edit asks the two-choice
 * question in place. The midnight mapping (D-G6) and the client validation
 * mirror live in `lib/blockForm.ts`.
 */
export function BlockSheet(props: BlockSheetProps) {
  const { mode, onSaved, onClose } = props;
  const event = mode === 'edit' ? props.block : undefined;
  const editKind: ScheduleBlockKind | undefined = event
    ? event.type === 'STUDY_BLOCK'
      ? 'STUDY'
      : 'BUSY'
    : undefined;

  const initialRef = useRef<BlockFormValues>(
    mode === 'create' ? defaultFormValues(props.initial) : fromBlock(props.block)
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    setFocus,
    formState: { errors, isSubmitted },
  } = useForm<BlockFormValues>({
    resolver: zodResolver(blockFormSchema),
    defaultValues: initialRef.current,
  });

  const kind = watch('kind');
  const weekly = watch('weekly');
  const weekdays = watch('weekdays');
  const endTime = watch('endTime');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(
    () => mode === 'edit' && hasNonDefaultMore(initialRef.current)
  );
  const [prompt, setPrompt] = useState<BlockFormValues | null>(null);
  /** Edit: the series shape is read once from the list (no `:id` route exists). */
  const [seriesState, setSeriesState] = useState<
    'idle' | 'loading' | 'ready' | 'missing' | 'error'
  >(mode === 'edit' ? 'loading' : 'ready');
  const [courses, setCourses] = useState<CoursesState>({ status: 'idle', courses: [] });
  const saveRef = useRef<HTMLButtonElement>(null);
  const moreId = 'block-sheet-more';

  // Edit mode: fetch the block row to pre-fill the chips and "Ends on".
  useEffect(() => {
    if (!event) return;
    let cancelled = false;
    listScheduleBlocks()
      .then((rows) => {
        if (cancelled) return;
        const row = rows.find((r) => r.id === event.blockId);
        if (!row) {
          setSeriesState('missing');
          setFormError('Resource not found — it may no longer exist.');
          return;
        }
        const values = fromBlock(event, row);
        initialRef.current = values;
        reset(values);
        setMoreOpen(hasNonDefaultMore(values));
        setSeriesState('ready');
        // The fields were disabled while loading, so the dialog's first-focus
        // found nothing; edit mode starts on Title (AC4 / UI/UX § Accessibility).
        window.setTimeout(() => setFocus('title'), 0);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSeriesState('error');
        setFormError(getErrorMessage(err) || "We couldn't load this block. Try again.");
      });
    return () => {
      cancelled = true;
    };
    // The event identity is fixed for the sheet's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // D-G8: courses load once, the first time Study is selected (a ref guards
  // the single request so the state change cannot cancel it).
  const coursesRequested = useRef(false);
  useEffect(() => {
    if (kind !== 'STUDY' || coursesRequested.current) return;
    coursesRequested.current = true;
    let cancelled = false;
    setCourses({ status: 'loading', courses: [] });
    listCourses()
      .then((rows) => {
        if (!cancelled) setCourses({ status: 'ready', courses: rows.filter((c) => c.isActive) });
      })
      .catch(() => {
        if (!cancelled) setCourses({ status: 'error', courses: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const disabled = isSubmitting || seriesState === 'loading' || seriesState === 'missing';
  const canSave = !isSubmitting && seriesState === 'ready';

  const requestClose = () => {
    if (isSubmitting) return; // frozen while a request is in flight
    if (prompt) {
      backToForm();
      return;
    }
    onClose();
  };

  const backToForm = () => {
    setPrompt(null);
    window.setTimeout(() => saveRef.current?.focus(), 0);
  };

  const handleApiError = (err: unknown) => {
    const apiError = extractApiError(err);
    if (apiError && apiError.statusCode === 400) {
      let mapped = false;
      for (const field of FIELD_ERROR_FIELDS) {
        const message = getFieldError(apiError, field);
        if (message) {
          setError(API_TO_FORM_FIELD[field], { type: 'server', message });
          mapped = true;
        }
      }
      if (!mapped) setFormError(apiErrorMessage(apiError));
      return;
    }
    if (apiError && apiError.statusCode === 404) {
      setFormError(`${apiErrorMessage(apiError)} — it may no longer exist.`);
      return;
    }
    toast.error(getErrorMessage(err) || "We couldn't save this. Try again.");
  };

  const run = async (work: () => Promise<void>) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await work();
    } catch (err: unknown) {
      handleApiError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (values: BlockFormValues) => {
    if (mode === 'create') {
      await run(async () => {
        await createScheduleBlock(toPayload(values));
        onSaved({ kind: values.kind, action: 'created' });
      });
      return;
    }
    const blockId = event?.blockId;
    if (!event || !blockId) return;
    const initial = initialRef.current;
    const body = toUpdatePayload(initial, values);
    const seriesChange = changedSeriesFields(initial, values);
    if (Object.keys(body).length === 0 && !seriesChange) {
      onClose(); // nothing changed — nothing to save or announce
      return;
    }
    if (!initial.weekly) {
      await run(async () => {
        await updateScheduleBlock(blockId, body);
        onSaved({ kind: values.kind, action: 'updated' });
      });
      return;
    }
    if (seriesChange) {
      // D-G10: series-level change → this and following, no question.
      await run(async () => {
        await updateScheduleBlock(blockId, { ...body, effectiveFrom: event.date });
        onSaved({ kind: values.kind, action: 'following' });
      });
      return;
    }
    setPrompt(values);
  };

  const applyThisDay = async () => {
    const values = prompt;
    const blockId = event?.blockId;
    if (!values || !event || !blockId) return;
    await run(async () => {
      // (a) the one-off with the edited values first — a failure here changes nothing.
      const oneOff = toPayload({ ...values, weekly: false });
      try {
        await createScheduleBlock(oneOff);
      } catch (err) {
        setPrompt(null);
        throw err;
      }
      // (b) then cancel the original occurrence; a failure leaves a visible duplicate, never a hole.
      try {
        await cancelOccurrence(blockId, event.date);
      } catch {
        onSaved({ kind: values.kind, action: 'this-day-partial' });
        return;
      }
      onSaved({ kind: values.kind, action: 'this-day' });
    });
  };

  const applyFollowing = async () => {
    const values = prompt;
    const blockId = event?.blockId;
    if (!values || !event || !blockId) return;
    await run(async () => {
      try {
        await updateScheduleBlock(blockId, {
          ...toUpdatePayload(initialRef.current, values),
          effectiveFrom: event.date,
        });
      } catch (err) {
        setPrompt(null);
        throw err;
      }
      onSaved({ kind: values.kind, action: 'following' });
    });
  };

  const title =
    mode === 'create'
      ? 'Add to calendar'
      : `Edit ${event?.title ?? (editKind === 'STUDY' ? 'Study' : 'Busy')}`;
  const placeholder = kind === 'STUDY' ? 'Study' : 'Busy';
  const showMore = weekly || kind === 'STUDY';
  const showSeriesHint = mode === 'edit' && initialRef.current.weekly && weekly;

  return (
    <Dialog
      open
      onClose={requestClose}
      title={title}
      size="md"
      busy={isSubmitting}
      className={BOTTOM_SHEET_CLASSES}
    >
      {prompt ? (
        <WeeklyChoicePrompt
          question={SAVE_PROMPT}
          onThisDay={() => void applyThisDay()}
          onFollowing={() => void applyFollowing()}
          onBack={backToForm}
          busy={isSubmitting}
        />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {mode === 'create' && (
            <fieldset>
              <legend className="sr-only">What is it?</legend>
              <div role="radiogroup" aria-label="What is it?" className="grid grid-cols-2 gap-2">
                {KIND_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const checked = kind === option.value;
                  return (
                    <label
                      key={option.value}
                      className={clsx(
                        'flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors duration-150 motion-reduce:transition-none',
                        'focus-within:outline-none focus-within:ring-2 focus-within:ring-accent',
                        'max-sm:min-h-[44px]',
                        checked
                          ? 'border-accent bg-accent/10'
                          : 'border-border bg-surface hover:border-border-strong',
                        disabled && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        aria-label={option.label}
                        className="mt-1 h-4 w-4 shrink-0 border-0 bg-transparent p-0"
                        disabled={disabled}
                        {...register('kind')}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-text">
                          <Icon aria-hidden size={14} className="shrink-0 text-text-muted" />
                          {option.label}
                          {checked && <span className="sr-only">Selected</span>}
                        </span>
                        <span className="mt-0.5 block text-xs text-text-muted">
                          {option.caption}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {seriesState === 'loading' && <p className="text-body-sm text-text-muted">Loading…</p>}

          <Input
            label="Title (optional)"
            placeholder={placeholder}
            maxLength={80}
            error={errors.title?.message}
            disabled={disabled}
            {...register('title')}
          />

          <Input
            label={weekly ? 'Starts on' : 'Date'}
            type="date"
            error={errors.date?.message}
            disabled={disabled}
            {...register('date')}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Start"
              type="time"
              error={errors.startTime?.message}
              disabled={disabled}
              {...register('startTime')}
            />
            <Input
              label="End"
              type="time"
              error={errors.endTime?.message}
              hint={endTime === '00:00' ? MIDNIGHT_HELPER : undefined}
              disabled={disabled}
              {...register('endTime')}
            />
          </div>

          <Switch
            label="Repeats weekly"
            checked={weekly}
            onCheckedChange={(next) => setValue('weekly', next, { shouldValidate: isSubmitted })}
            disabled={disabled}
          />

          {weekly && (
            <WeekdayChips
              value={weekdays}
              onChange={(next) => setValue('weekdays', next, { shouldValidate: isSubmitted })}
              error={errors.weekdays?.message}
              hint={showSeriesHint ? SERIES_HINT : undefined}
              disabled={disabled}
            />
          )}

          {showMore && (
            <div>
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-controls={moreId}
                onClick={() => setMoreOpen((o) => !o)}
                disabled={disabled}
                className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent max-sm:min-h-[44px]"
              >
                {moreOpen ? (
                  <ChevronUp aria-hidden size={16} />
                ) : (
                  <ChevronDown aria-hidden size={16} />
                )}
                More
              </button>
              {moreOpen && (
                <div id={moreId} className="mt-3 space-y-4">
                  {weekly && (
                    <Input
                      label="Ends on"
                      type="date"
                      hint="Optional — leave empty to keep going"
                      error={errors.endDate?.message}
                      disabled={disabled}
                      {...register('endDate')}
                    />
                  )}
                  {kind === 'STUDY' && courses.status !== 'error' && (
                    <Select
                      label="Course"
                      error={errors.courseId?.message}
                      disabled={disabled || courses.status === 'loading'}
                      {...register('courseId')}
                    >
                      {courses.status === 'loading' ? (
                        <option value="" disabled>
                          Loading courses…
                        </option>
                      ) : (
                        <>
                          <option value="">No course</option>
                          {courses.courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code} — {c.name}
                            </option>
                          ))}
                        </>
                      )}
                    </Select>
                  )}
                  {kind === 'STUDY' && courses.status === 'error' && (
                    <p className="text-body-sm text-text-muted">{COURSES_FAILED_NOTE}</p>
                  )}
                  {kind === 'STUDY' && (
                    <Select
                      label="Energy"
                      hint="The planner gives demanding work to high-energy time."
                      error={errors.energy?.message}
                      disabled={disabled}
                      {...register('energy')}
                    >
                      {ENERGY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              )}
            </div>
          )}

          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
            >
              <p>{formError}</p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={requestClose}
              disabled={isSubmitting}
              className="max-sm:min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              ref={saveRef}
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={!canSave}
              data-dialog-commit
              aria-label="Save"
              className="max-sm:min-h-[44px]"
            >
              Save
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

/** Kind → the noun the announcements use (EP15G-AC4). */
export const KIND_LABEL: Record<ScheduleBlockKind, string> = { BUSY: 'Busy', STUDY: 'Study block' };
export const isBlockEvent = (e: CalendarEvent) => e.type === 'EVENT' || e.type === 'STUDY_BLOCK';
export const blockKindOf = (e: CalendarEvent): ScheduleBlockKind =>
  e.type === 'STUDY_BLOCK' ? 'STUDY' : 'BUSY';

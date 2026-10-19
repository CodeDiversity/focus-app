import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/model/AuthContext';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { getFieldError, getErrorMessage } from '@/shared/lib/errors';
import {
  formatDateTime,
  getBrowserTimeZone,
  getTimeZones,
  isValidTimeZone,
} from '@/shared/lib/datetime';
// RD7: sanctioned features → app import for typed dispatch hook
// eslint-disable-next-line import/no-restricted-paths
import { useAppDispatch } from '@/app/store/hooks';
import { advanceOnboarding } from '../model/onboardingSlice';

/**
 * Validation mirrors the SP-106B backend rules for `PATCH /users/me`:
 * name non-empty ≤ 100 chars; time zone a valid IANA identifier (select-by-
 * construction + `isValidTimeZone` safety net — the ticket's AC 3).
 */
const step1Schema = z.object({
  name: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be 100 characters or fewer'),
  timeZone: z
    .string()
    .min(1, 'Enter a valid IANA time zone, e.g. America/New_York')
    .refine(isValidTimeZone, 'Enter a valid IANA time zone, e.g. America/New_York'),
});

type Step1FormData = z.infer<typeof step1Schema>;

// D106-3 pre-fill rule (consumed from SP-106E, never forked): the stored zone
// when it is anything but the schema default ("UTC"), otherwise the
// browser-detected zone the student can change.
const zoneForForm = (stored: string | undefined): string =>
  stored && stored !== 'UTC' ? stored : getBrowserTimeZone();

/**
 * Wizard step 1 — preferences (SP-107C).
 *
 * Display name + time zone, pre-filled from the current profile (the same
 * D106-3 rule and SP-106C hydration pattern as `ProfilePage`). Submit reuses
 * the existing `updateProfile` thunk (`PATCH /users/me`) **then** advances
 * the onboarding pointer (`PATCH /onboarding { step: 2 }`), so progress is
 * saved after the step completes (AC-107-02).
 *
 * Failure handling (AC 3): a profile-save failure shows field-level errors
 * from the `errors` map (or a sanitized toast) and stays on step 1; a
 * progress-save failure is recorded by the slice — the shell displays it and
 * the idempotent submit acts as the retry (the step-1 data is already
 * persisted).
 */
export function Step1Preferences() {
  const { user, updateProfile, refreshProfile, isLoading } = useAuth();
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const storedTimeZone = user?.timeZone;
  const defaultTimeZone = zoneForForm(storedTimeZone);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, dirtyFields },
    reset,
    setError,
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: user?.name || '',
      timeZone: defaultTimeZone,
    },
  });

  // SP-106C (IR-106-01): login/refresh/boot session users carry no
  // `timeZone` (the auth service projects only id/name/email/emailVerifiedAt),
  // so the first render cannot know the stored value. Read the full profile
  // once through the shared AuthContext helper, then re-seed the form —
  // react-hook-form's `defaultValues` do not refresh after mount — so the
  // field shows the stored zone instead of the browser fallback.
  //
  // The request is made one microtask after the session user exists: the
  // provider mirrors `user` into its own ref in an effect that runs *after*
  // this component's mount effects, so calling `refreshProfile()`
  // synchronously in that first effect would be a silent no-op.
  const requestedProfile = useRef(false);
  const appliedStoredProfile = useRef(false);
  const studentEdited = useRef(false);
  const markEdited = useCallback(() => {
    studentEdited.current = true;
  }, []);

  // The display line follows the live form value, so changing the selection
  // updates it in real time — no save required.
  const watchedTimeZone = watch('timeZone');
  const displayedTimeZone = watchedTimeZone ?? storedTimeZone ?? defaultTimeZone;
  // `formatDateTime` throws on a zone the runtime rejects (e.g. a stored
  // alias that is not IANA-valid here); the clock is the optional part of
  // the line — the raw value always renders, the clock only when valid.
  const displayedDateTime = isValidTimeZone(displayedTimeZone)
    ? formatDateTime(new Date(), displayedTimeZone)
    : null;

  // The option list is immutable and memoized by the shared helper
  // (IR-106-15b); recompute only when the pre-fill default changes.
  const timeZoneOptions = useMemo(() => {
    const zones = getTimeZones();
    // IR-106-15(c): a stored non-canonical alias (e.g. `US/Pacific`, written
    // through the API) is absent from the runtime's canonical list. Offer it
    // explicitly so the pre-selected value round-trips instead of silently
    // resolving to the first option on save.
    if (isValidTimeZone(defaultTimeZone) && !zones.includes(defaultTimeZone)) {
      return [defaultTimeZone, ...zones];
    }
    return zones;
  }, [defaultTimeZone]);

  useEffect(() => {
    if (!user || requestedProfile.current) return;
    requestedProfile.current = true;
    void Promise.resolve().then(() => refreshProfile());
  }, [user, refreshProfile]);

  useEffect(() => {
    if (!user) return;
    if (appliedStoredProfile.current || user.timeZone === undefined) return;
    appliedStoredProfile.current = true;
    // Unsaved keystrokes win: never overwrite what the student is typing.
    if (studentEdited.current) return;
    reset({ name: user.name || '', timeZone: zoneForForm(user.timeZone) });
  }, [user, reset]);

  const onSubmit = async (data: Step1FormData) => {
    setIsSubmitting(true);

    try {
      // IR-106-01: the zone rides along with every save (the form contract),
      // *except* when the stored value is still unknown — the session user
      // carried no `timeZone` and the profile read did not supply one — and
      // the student did not touch the field. In that case the value shown is
      // only the browser fallback, and sending it would overwrite a stored
      // preference the form could not read.
      const payload: { name?: string; timeZone?: string } = { name: data.name };
      if (storedTimeZone !== undefined || dirtyFields.timeZone) {
        payload.timeZone = data.timeZone;
      }

      await updateProfile(payload);
      // A submitted edit is the new baseline for the next save.
      reset(data);

      // Progress is saved after the step completes (AC-107-02). On rejection
      // the slice keeps the previous step and records the error the shell
      // displays (the idempotent submit is the retry); on success the slice's
      // step becomes 2 and the shell re-renders step 2.
      await dispatch(advanceOnboarding({ step: 2 }));
    } catch (err: unknown) {
      // A 400 carrying the SP-106B `errors` map renders its messages under
      // the matching inputs (the a11y wiring picks up aria-invalid/
      // describedby); any other failure keeps the sanitized toast. Field-
      // level feedback replaces the toast to avoid duplication.
      const nameMessage = getFieldError(err, 'name');
      const timeZoneMessage = getFieldError(err, 'timeZone');
      if (nameMessage) {
        setError('name', { type: 'server', message: nameMessage });
      }
      if (timeZoneMessage) {
        setError('timeZone', { type: 'server', message: timeZoneMessage });
      }
      if (!nameMessage && !timeZoneMessage) {
        toast.error(getErrorMessage(err) || 'We could not save your preferences. Try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Display name"
          placeholder="John"
          error={errors.name?.message}
          disabled={isSubmitting || isLoading}
          {...register('name', { onChange: markEdited })}
        />

        <Select
          label="Time zone"
          error={errors.timeZone?.message}
          disabled={isSubmitting || isLoading}
          {...register('timeZone', { onChange: markEdited })}
        >
          {timeZoneOptions.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </Select>
        <p className="text-sm text-secondary-500">
          Your time zone: <span className="font-mono">{displayedTimeZone}</span>
          {displayedDateTime ? ` (currently ${displayedDateTime} there)` : ''}
        </p>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-4">
        <Button type="submit" variant="primary" isLoading={isSubmitting || isLoading}>
          Save and continue
        </Button>
      </div>
    </form>
  );
}

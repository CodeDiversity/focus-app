import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/model/AuthContext';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { getFieldError, getErrorMessage } from '@/shared/lib/errors';
import { formatDateTime, getBrowserTimeZone, isValidTimeZone } from '@/shared/lib/datetime';

// Validation schema — the time zone is free text (D106-8) validated with the
// shared TECH-01 IANA check (D106-4). Refinement runs before any request, so
// an invalid identifier never reaches the API (AC-106-03, TR-106-01 client half).
const profileSchema = z.object({
  name: z.string().min(1, 'Display name is required'),
  timeZone: z
    .string()
    .min(1, 'Enter a valid IANA time zone, e.g. America/New_York')
    .refine(isValidTimeZone, 'Enter a valid IANA time zone, e.g. America/New_York'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// D106-3 pre-fill rule: the stored zone when it is anything but the schema
// default ("UTC"), otherwise the browser-detected zone the student can change.
const zoneForForm = (stored: string | undefined): string =>
  stored && stored !== 'UTC' ? stored : getBrowserTimeZone();

export function ProfilePage() {
  const { user, updateProfile, refreshProfile, isLoading, logout } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const storedTimeZone = user?.timeZone;
  const defaultTimeZone = zoneForForm(storedTimeZone);

  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
    reset,
    setError,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      timeZone: defaultTimeZone,
    },
  });

  // IR-106-01: login/refresh/boot session users carry no `timeZone` (the auth
  // service projects only id/name/email/emailVerifiedAt), so the first render
  // cannot know the stored value. Read the full profile once through the
  // shared AuthContext helper, then re-seed the form — react-hook-form's
  // `defaultValues` do not refresh after mount — so the field and the display
  // line show the stored zone instead of the browser fallback.
  //
  // The request is made one microtask after the session user exists: the
  // provider mirrors `user` into its own ref in an effect that runs *after*
  // this page's mount effects, so calling `refreshProfile()` synchronously in
  // that first effect would be a silent no-op.
  const requestedProfile = useRef(false);
  const appliedStoredProfile = useRef(false);
  const studentEdited = useRef(false);
  const markEdited = useCallback(() => {
    studentEdited.current = true;
  }, []);

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

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);

    try {
      // D106-9: the M1 form edits name + timeZone only, so `preferences` is
      // omitted and the stored bag is left untouched by the partial update.
      const payload: { name?: string; timeZone?: string } = { name: data.name };
      // IR-106-01: the zone rides along with every save (the form contract),
      // *except* when the stored value is still unknown — the session user
      // carried no `timeZone` and the profile read did not supply one — and
      // the student did not touch the field. In that case the value shown is
      // only the browser fallback, and sending it would overwrite a stored
      // preference the form could not read.
      if (storedTimeZone !== undefined || dirtyFields.timeZone) {
        payload.timeZone = data.timeZone;
      }

      await updateProfile(payload);
      // A submitted edit is the new baseline for the next save.
      reset(data);
      toast.success('Profile updated successfully!');
    } catch (err: unknown) {
      // AC-106-06: a 400 carrying the SP-106B `errors` map renders its
      // message under the matching input (the Input a11y wiring picks up
      // aria-invalid/describedby); any other failure keeps the sanitized
      // toast. Field-level feedback replaces the toast to avoid duplication.
      const timeZoneMessage = getFieldError(err, 'timeZone');
      const nameMessage = getFieldError(err, 'name');
      if (timeZoneMessage) {
        setError('timeZone', { type: 'server', message: timeZoneMessage });
      }
      if (nameMessage) {
        setError('name', { type: 'server', message: nameMessage });
      }
      if (!timeZoneMessage && !nameMessage) {
        toast.error(getErrorMessage(err) || 'Failed to update profile');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Profile</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={user?.email || ''}
              disabled
              readOnly
            />

            <Input
              label="Display Name"
              placeholder="John"
              error={errors.name?.message}
              disabled={isSubmitting || isLoading}
              {...register('name', { onChange: markEdited })}
            />

            <Input
              label="Time Zone"
              placeholder="America/New_York"
              error={errors.timeZone?.message}
              disabled={isSubmitting || isLoading}
              {...register('timeZone', { onChange: markEdited })}
            />
            <p className="text-sm text-secondary-500">
              Your time zone: <span className="font-mono">{storedTimeZone ?? defaultTimeZone}</span>{' '}
              (currently {formatDateTime(new Date(), storedTimeZone ?? defaultTimeZone)} there)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting || isLoading}
            >
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
              disabled={isSubmitting || isLoading}
            >
              Reset
            </Button>
          </div>
        </form>

        <hr className="my-8 border-secondary-200" />

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-secondary-900">Account Actions</h2>
          <Button
            variant="danger"
            onClick={logout}
            className="w-full sm:w-auto"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}

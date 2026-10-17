import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { getFieldError, getErrorMessage } from '../utils/errors';
import { formatDateTime, getBrowserTimeZone, isValidTimeZone } from '../utils/datetime';

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

export function ProfilePage() {
  const { user, updateProfile, isLoading, logout } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // D106-3 pre-fill: the stored zone when it is anything but the schema
  // default ("UTC"), otherwise the browser-detected zone the student can
  // change. Login/refresh session users may not carry the field at all —
  // they get the browser zone too (the DB default for fresh students).
  const storedTimeZone = user?.timeZone;
  const defaultTimeZone =
    storedTimeZone && storedTimeZone !== 'UTC' ? storedTimeZone : getBrowserTimeZone();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      timeZone: defaultTimeZone,
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);

    try {
      // D106-9: the M1 form edits name + timeZone only; `preferences` is
      // omitted so the PATCH partial update leaves the stored bag untouched.
      await updateProfile({ name: data.name, timeZone: data.timeZone });
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
              {...register('name')}
            />

            <Input
              label="Time Zone"
              placeholder="America/New_York"
              error={errors.timeZone?.message}
              disabled={isSubmitting || isLoading}
              {...register('timeZone')}
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

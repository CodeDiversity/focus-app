import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { getErrorMessage } from '../utils/errors';

// Validation schema
const profileSchema = z.object({
  name: z.string().min(1, 'Display name is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const { user, updateProfile, isLoading, logout } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);

    try {
      await updateProfile(data);
      toast.success('Profile updated successfully!');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Failed to update profile');
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

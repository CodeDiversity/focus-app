import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { getErrorMessage } from '../utils/errors';

// Validation schema
const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /[A-Z]/,
      'Password must contain at least one uppercase letter',
    )
    .regex(
      /[0-9]/,
      'Password must contain at least one number',
    ),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { register: authRegister, isLoading, clearError } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    clearError();
    setIsSubmitting(true);

    try {
      await authRegister(
        data.email,
        data.password,
        data.firstName,
        data.lastName,
      );
      toast.success('Account created successfully!');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-secondary-900">Create Account</h1>
          <p className="mt-2 text-secondary-600">
            Join StudyPilot and take control of your studies
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="John"
                error={errors.firstName?.message}
                disabled={isSubmitting || isLoading}
                {...register('firstName')}
              />
              <Input
                label="Last Name"
                placeholder="Doe"
                error={errors.lastName?.message}
                disabled={isSubmitting || isLoading}
                {...register('lastName')}
              />
            </div>

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              disabled={isSubmitting || isLoading}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Create a strong password"
              error={errors.password?.message}
              disabled={isSubmitting || isLoading}
              {...register('password')}
              hint="Must be at least 8 characters with uppercase and number"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isSubmitting || isLoading}
            >
              Create Account
            </Button>
          </div>
        </form>

        <div className="text-center text-sm text-secondary-600">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

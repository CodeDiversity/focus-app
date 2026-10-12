import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { getErrorMessage } from '../utils/errors';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, isLoading, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Get redirect path from location state
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
    '/dashboard';

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    setIsSubmitting(true);

    try {
      await login(data.email, data.password);
      toast.success('Logged in successfully!');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-secondary-900">Welcome back!</h1>
          <p className="mt-2 text-secondary-600">
            Sign in to your StudyPilot account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card">
          <div className="space-y-6">
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
              placeholder="Your password"
              error={errors.password?.message}
              disabled={isSubmitting || isLoading}
              {...register('password')}
            />

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isSubmitting || isLoading}
            >
              Sign In
            </Button>
          </div>
        </form>

        <div className="text-center text-sm text-secondary-600">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

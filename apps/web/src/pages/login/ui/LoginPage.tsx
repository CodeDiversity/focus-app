import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/model/AuthContext';
import { fetchOnboardingState } from '@/features/onboarding/model/onboardingSlice';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { getErrorMessage } from '@/shared/lib/errors';
// RD7: sanctioned pages → app import for typed dispatch hook
// eslint-disable-next-line import/no-restricted-paths
import { useAppDispatch } from '@/app/store/hooks';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, isLoading, clearError } = useAuth();
  const dispatch = useAppDispatch();
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
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard';

  const sessionExpired = Boolean(
    (
      location.state as {
        sessionExpired?: boolean;
        expired?: boolean;
      } | null
    )?.sessionExpired || (location.state as { expired?: boolean } | null)?.expired
  );
  const expiredToastShown = useRef(false);

  useEffect(() => {
    if (sessionExpired && !expiredToastShown.current) {
      expiredToastShown.current = true;
      toast.error('Your session has expired. Please sign in again.');
    }
  }, [sessionExpired]);

  // C10: one-time notice for the reset handoff — ResetPassword navigates here
  // with `state: { reset: true }` after a successful reset. The ref consumes
  // it once per mount so re-renders (typing, focus) never re-fire the toast.
  const passwordReset = Boolean((location.state as { reset?: boolean } | null)?.reset);
  const resetToastShown = useRef(false);

  useEffect(() => {
    if (passwordReset && !resetToastShown.current) {
      resetToastShown.current = true;
      toast.success('Password updated — sign in with your new password.');
    }
  }, [passwordReset]);

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    setIsSubmitting(true);

    try {
      await login(data.email, data.password);
      toast.success('Logged in successfully!');

      // SP-107C (AC-107-01): route to the wizard unless onboarding is already
      // complete. F-107C-3: on fetch failure we still navigate to
      // /onboarding — the page shows an actionable error + retry, so a new
      // student is never stranded on the login screen.
      const result = await dispatch(fetchOnboardingState());
      // A rejected fetch carries the sanitized message (a string) as its
      // payload; only a fulfilled result carries the state object.
      const completed = fetchOnboardingState.fulfilled.match(result) && result.payload.completed;
      navigate(completed ? from : '/onboarding', { replace: true });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text">Welcome back!</h1>
          <p className="mt-2 text-text-muted">Sign in to your StudyPilot account</p>
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
              <Link to="/forgot-password" className="text-sm text-accent hover:text-accent-hover">
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

        <div className="text-center text-sm text-text-muted">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-accent hover:text-accent-hover font-medium">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { authService } from '@/features/auth/api/authService';
import { isRecoveryError } from '@/shared/api/recovery';
import { getErrorMessage } from '@/shared/lib/errors';

// Validation mirrors the backend ForgotPasswordDto (trim / 254 max / email)
// with the same messages, so client and server agree on what is invalid.
const forgotSchema = z.object({
  email: z
    .string({ required_error: 'Please enter a valid email address' })
    .trim()
    .email('Please enter a valid email address')
    .max(254, 'Please enter a valid email address'),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

/**
 * SP-105C — the password-reset request screen.
 *
 * Always reachable (signed in or out — a signed-in user resets the account
 * their email belongs to). The 200 body's message is rendered verbatim: it is
 * the single generic state the backend returns for known, unknown and
 * cooldown accounts, so the UI can never branch on account existence.
 *
 * Failures arrive as sanitized `RecoveryError`s from the SP-105G boundary.
 * A 429 runs a monotonic-clock countdown (Retry-After, 60s fallback) that
 * only re-enables an *explicit* retry — never an automatic resubmission, and
 * the typed email is kept for it. 503/network failures offer retry with no
 * countdown. Submit is intentionally NOT gated on the AuthContext boot state:
 * the recovery boundary's own drain barrier orders reset requests, and a
 * hanging boot refresh must not block this form.
 */
export function ForgotPasswordPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryDeadline, setRetryDeadline] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const submitting = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  // The 429 wait is measured from receipt on the monotonic clock and ticks
  // down once a second; at zero the deadline clears and the form re-enables.
  useEffect(() => {
    if (!retryDeadline) {
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((retryDeadline - performance.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) {
        setRetryDeadline(0);
      }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [retryDeadline]);

  const onSubmit = async (data: ForgotFormData) => {
    if (submitting.current || secondsRemaining > 0) {
      return;
    }
    submitting.current = true;
    setIsSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);
    try {
      const result = await authService.requestPasswordReset(data.email);
      setSuccessMessage(result.message);
    } catch (err: unknown) {
      if (isRecoveryError(err)) {
        setFormError(err.message);
        if (err.status === 429 && err.retryAfterSeconds) {
          setRetryDeadline(performance.now() + err.retryAfterSeconds * 1000);
        }
      } else {
        setFormError(getErrorMessage(err));
      }
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-3xl font-bold text-text mb-3">Reset your password</h1>
      <p className="text-text-muted mb-6">
        Enter the email address of your account and we&apos;ll send you a link to choose a new
        password.
      </p>
      <div className="card space-y-6">
        <div role="status" aria-live="polite" aria-atomic="true">
          {isSubmitting && <p>Requesting your reset link…</p>}
          {successMessage && <p className="text-success">{successMessage}</p>}
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
          aria-busy={isSubmitting}
        >
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            disabled={isSubmitting || secondsRemaining > 0}
            {...register('email')}
          />
          {formError && (
            <p role="alert" className="text-danger">
              {formError}
            </p>
          )}
          {secondsRemaining > 0 && (
            <p className="text-sm text-text-muted">
              Try again in {secondsRemaining} second{secondsRemaining === 1 ? '' : 's'}.
            </p>
          )}
          <Button
            type="submit"
            disabled={secondsRemaining > 0}
            isLoading={isSubmitting}
            className="rounded-lg w-full sm:w-auto"
          >
            {isSubmitting ? 'Requesting link…' : 'Send reset link'}
          </Button>
        </form>
        {successMessage && (
          <p className="text-sm text-text-muted">
            Didn&apos;t get the email? Check your spam folder, or send another request below.
          </p>
        )}
      </div>
      <Link className="inline-block mt-6 underline rounded focus-visible:ring-2" to="/login">
        Back to sign in
      </Link>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { authService } from '../services/auth';
import { isRecoveryError } from '../services/recovery';
import { getErrorMessage } from '../utils/errors';
import { readLinkToken } from '../utils/linkToken';

// C11 — byte-identical to the backend's uniform invalid-link message
// (SP-105B `INVALID_RESET_MESSAGE`). G's dedup keeps it byte-stable across
// the DTO-validation and service-exception paths, so this equality check —
// alongside a successful reset — is the only thing that consumes the token.
const INVALID_RESET_MESSAGE = 'This reset link is invalid or has expired. Please request a new one.';

// Mirrors the backend ResetPasswordDto: min 8, confirm must match. The
// password is taken exactly as sent (no trim, no max on the server), so the
// client must not transform it either.
const resetSchema = z
  .object({
    password: z
      .string({ required_error: 'Password must be at least 8 characters' })
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string({ required_error: 'Passwords do not match' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetFormData = z.infer<typeof resetSchema>;

/**
 * SP-105C — the password-reset screen (the email link's destination).
 *
 * C2: the token is captured once from the URL fragment (43-char base64url)
 * and the fragment is stripped via history-replace, so it never sits in the
 * displayed URL. C11: the in-memory token is cleared only on success or on
 * the byte-exact uniform invalid-link message; field errors, 429, 503,
 * network and drain-timeout failures keep it for the retry.
 *
 * The request runs through G's `runRecoveryReset` boundary (drain, send,
 * commit-on-success, sanitize). Submit is intentionally NOT gated on the
 * AuthContext boot state: the boundary's own drain barrier orders the reset
 * against the in-flight refresh, and a hanging boot restore must not block
 * this form. On success the page navigates to /login with the one-time
 * notice state (C3/C10) — G has already cleared the local token/user, and
 * B expires the HttpOnly cookie server-side; this page never writes
 * document.cookie.
 */
export function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // Pure initialization survives StrictMode; the URL strip happens after capture.
  const [token, setToken] = useState(() => readLinkToken(location.hash));
  const [invalid, setInvalid] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryDeadline, setRetryDeadline] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const submitting = useRef(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!location.hash) return;
    setToken(readLinkToken(location.hash));
    setInvalid(false);
    setFormError(null);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.hash, location.pathname, location.search, navigate]);

  // C9: the 429 wait is measured from receipt on the monotonic clock and
  // ticks down once a second; at zero the form re-enables an *explicit*
  // retry — never an automatic resubmission.
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

  const onSubmit = async (data: ResetFormData) => {
    if (!token || submitting.current || secondsRemaining > 0) {
      return;
    }
    submitting.current = true;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await authService.resetPassword({
        token,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      // C3/C12: G has committed the session clear — hand off to /login with
      // the one-time notice state; the page unmounts with the navigation.
      navigate('/login', { replace: true, state: { reset: true } });
    } catch (err: unknown) {
      if (isRecoveryError(err)) {
        if (err.status === 400 && err.message === INVALID_RESET_MESSAGE) {
          // C11: the link is consumed — show the uniform message, drop the form.
          setToken(null);
          setInvalid(true);
        } else {
          // C7: the implemented filter carries the deduped message (the
          // `error` field is a string, so `fieldErrors` is usually absent) —
          // render it as a form-level alert; map a field map onto fields if
          // one is ever present.
          setFormError(err.message);
          if (err.fieldErrors) {
            for (const [field, messages] of Object.entries(err.fieldErrors)) {
              if ((field === 'password' || field === 'confirmPassword') && messages[0]) {
                setError(field, { message: messages[0] });
              }
            }
          }
        }
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
      <h1 className="text-3xl font-bold mb-3">Choose a new password</h1>
      <p className="text-secondary-700 mb-6">
        {token
          ? 'Enter your new password below. It must be at least 8 characters.'
          : 'The link in your reset email takes you here.'}
      </p>
      <div className="card space-y-6">
        <div role="status" aria-live="polite" aria-atomic="true">
          {isSubmitting && <p>Updating your password…</p>}
        </div>

        {invalid ? (
          <>
            <p role="alert" className="text-red-700">{INVALID_RESET_MESSAGE}</p>
            <Link className="inline-block underline rounded focus-visible:ring-2" to="/forgot-password">
              Request a new reset link
            </Link>
          </>
        ) : token ? (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4" aria-busy={isSubmitting}>
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              disabled={isSubmitting || secondsRemaining > 0}
              {...register('password')}
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              disabled={isSubmitting || secondsRemaining > 0}
              {...register('confirmPassword')}
            />
            {formError && <p role="alert" className="text-red-700">{formError}</p>}
            {secondsRemaining > 0 && (
              <p className="text-sm text-secondary-700">
                Try again in {secondsRemaining} second{secondsRemaining === 1 ? '' : 's'}.
              </p>
            )}
            <Button
              type="submit"
              disabled={secondsRemaining > 0}
              isLoading={isSubmitting}
              className="rounded-lg w-full sm:w-auto"
            >
              {isSubmitting ? 'Updating password…' : 'Update password'}
            </Button>
          </form>
        ) : (
          <>
            <p className="text-secondary-700">
              This page needs the link from your reset email. Check your inbox, including spam.
            </p>
            <Link className="inline-block underline rounded focus-visible:ring-2" to="/forgot-password">
              Request a new reset link
            </Link>
          </>
        )}
      </div>
      <Link className="inline-block mt-6 underline rounded focus-visible:ring-2" to="/login">
        Back to sign in
      </Link>
    </div>
  );
}

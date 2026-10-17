import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth';
import { resendFeedback, useResendVerification } from '../hooks/useResendVerification';
import { readLinkToken } from '@/shared/lib/linkToken';

export function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshProfile } = useAuth();
  // Pure initialization survives StrictMode; URL replacement happens after capture.
  // Confirmation uses local state rather than a mutation cache containing a token.
  const [token, setToken] = useState(() => readLinkToken(location.hash));
  const [confirmationState, setConfirmationState] = useState<'ready' | 'pending' | 'success' | 'error'>('ready');
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const confirming = useRef(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const emailInput = useRef<HTMLInputElement>(null);
  const resend = useResendVerification();

  useEffect(() => {
    if (!location.hash) return;
    setToken(readLinkToken(location.hash));
    setConfirmationState('ready');
    setConfirmationError(null);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.hash, location.pathname, location.search, navigate]);

  const confirm = async () => {
    if (!token || confirming.current) return;
    confirming.current = true;
    setConfirmationState('pending');
    setConfirmationError(null);
    try {
      await authService.verifyEmail(token);
      setToken(null);
      setConfirmationState('success');
      void refreshProfile({ fresh: true });
    } catch (error: unknown) {
      const failure = error as Error & { statusCode?: number };
      if (failure.statusCode === 400) setToken(null);
      setConfirmationError(failure.message);
      setConfirmationState('error');
    } finally {
      confirming.current = false;
    }
  };

  const requestEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!z.string().email().safeParse(normalized).success) {
      setEmailError('Please enter a valid email address');
      emailInput.current?.focus();
      return;
    }
    setEmailError(undefined);
    await resend.sendEmail(normalized);
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-3xl font-bold mb-3">Verify your email</h1>
      <p className="text-secondary-700 mb-6">You can keep using StudyPilot while your email is unverified.</p>
      <div className="card space-y-6">
        <section aria-label="Email confirmation" className="space-y-4">
          <div role="status" aria-label="Confirmation status" aria-live="polite" aria-atomic="true">
            {confirmationState === 'pending' && <p>Verifying your email…</p>}
            {confirmationState === 'success' && <p className="text-green-800">Email verified successfully. You can continue using StudyPilot.</p>}
          </div>
          {confirmationError && <p role="alert" className="text-red-700">{confirmationError}</p>}
          {token ? (
            <>
              <p>Select the button to confirm the email address this link was sent to.</p>
              <Button onClick={() => void confirm()} disabled={confirmationState === 'pending'} aria-busy={confirmationState === 'pending'} className="rounded-lg w-full sm:w-auto">
                {confirmationState === 'pending' ? 'Verifying email…' : 'Verify email'}
              </Button>
            </>
          ) : confirmationState === 'ready' && <p>Open the link in your inbox, or request a new verification email below.</p>}
        </section>

        <section aria-labelledby="resend-heading" className="border-t border-secondary-200 pt-6 space-y-4">
          <h2 id="resend-heading" className="text-lg">Request a verification email</h2>
          <p className="text-sm text-secondary-700">Enter your account email address. Check your inbox, including spam, for the link.</p>
          <form onSubmit={requestEmail} noValidate className="space-y-4" aria-busy={resend.isPending}>
            <Input ref={emailInput} label="Email address" type="email" autoComplete="email" value={email} onChange={event => { setEmail(event.target.value); setEmailError(undefined); }} error={emailError} disabled={resend.isPending} />
            {emailError && <p role="alert" className="sr-only">{emailError}</p>}
            <Button type="submit" disabled={resend.isPending || resend.secondsRemaining > 0} className="rounded-lg w-full sm:w-auto">
              {resend.isPending ? 'Requesting email…' : 'Send verification email'}
            </Button>
          </form>
          <div role="status" aria-label="Resend status" aria-live="polite" aria-atomic="true" className="text-sm text-secondary-700">
            {resend.isPending ? 'Requesting a verification email…' : resend.isSuccess ? resendFeedback : ''}
          </div>
          {resend.secondsRemaining > 0 && <p className="text-sm text-secondary-700">Try again in {resend.secondsRemaining} seconds.</p>}
          {resend.error && <p role="alert" className="text-red-700">{resend.error}</p>}
        </section>
        <Link className="inline-block underline rounded focus-visible:ring-2" to={isAuthenticated ? '/dashboard' : '/login'}>{isAuthenticated ? 'Back to dashboard' : 'Go to login'}</Link>
        {user && <p className="text-sm text-secondary-700 break-words">Signed in as {user.email}. This link confirms its recipient’s email and keeps your current session.</p>}
      </div>
    </div>
  );
}

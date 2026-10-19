import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/AuthContext';
import {
  completeOnboarding,
  fetchOnboardingState,
  selectOnboardingCompleted,
  selectOnboardingError,
  selectOnboardingStatus,
  selectOnboardingStep,
} from '@/features/onboarding/model/onboardingSlice';
import { WizardShell } from '@/features/onboarding/ui/WizardShell';
// RD7: sanctioned pages → app import for typed store hooks
// eslint-disable-next-line import/no-restricted-paths
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';

/**
 * Onboarding wizard route screen (SP-107C).
 *
 * Protected route rendered within the standard `Layout` (D107-3, same
 * placement as all existing pages). On load it loads the onboarding state —
 * from the onboarding slice if already fetched, else `GET /onboarding` — and:
 *
 * - `completed` → redirect to `/dashboard` (AC-107-05): covers both the
 *   login entry and a completed/skipped student's direct `/onboarding` URL
 *   (AC-107-07); the wizard never re-appears.
 * - otherwise → render the wizard at the stored `step` (resume at the first
 *   incomplete step, AC-107-03).
 *
 * The wizard footer offers sign-out (the exit + resume path — signing in
 * again re-enters at the saved step); there is no boot-time gate and no
 * persistent header link in M1 (D107-3).
 */
export function OnboardingPage() {
  const dispatch = useAppDispatch();
  const { logout } = useAuth();
  const status = useAppSelector(selectOnboardingStatus);
  const step = useAppSelector(selectOnboardingStep);
  const completed = useAppSelector(selectOnboardingCompleted);
  const error = useAppSelector(selectOnboardingError);
  const [isSkipping, setIsSkipping] = useState(false);

  // AC 1: load the state on mount only when the slice has none yet — a
  // cached read (e.g. right after login) is reused, not re-fetched.
  useEffect(() => {
    if (status === 'idle') {
      void dispatch(fetchOnboardingState());
    }
  }, [dispatch, status]);

  // AC 1 / AC 5 / AC 7: terminal state → the dashboard, never the wizard.
  if (status === 'ready' && completed) {
    return <Navigate to="/dashboard" replace />;
  }

  // AC 4 (D107-4): skip records terminal completion; the `completed` flip
  // above then redirects to the dashboard. A failed write keeps the wizard
  // and records the error the shell displays (the skip button is the retry).
  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      await dispatch(completeOnboarding());
    } finally {
      setIsSkipping(false);
    }
  };

  return (
    <WizardShell
      status={status}
      step={step}
      error={error}
      onRetryFetch={() => void dispatch(fetchOnboardingState())}
      onSkip={() => void handleSkip()}
      onSignOut={() => void logout()}
      isBusy={isSkipping}
    />
  );
}

import { clsx } from 'clsx';
import { Button } from '@/shared/ui/Button';
import type { OnboardingStatus } from '../model/onboardingSlice';
import { Step1Preferences } from './Step1Preferences';
import { Step2Semester } from './Step2Semester';

/** Per-step titles for the indicator and the "coming" placeholder. */
const STEP_TITLES: Record<number, string> = {
  1: 'Your preferences',
  2: 'Your first semester',
  3: 'Your first course',
};

/**
 * Step 3 renders as a "coming" placeholder until SP-107E lands its form in
 * this folder; the shell renders step content by step number so the real
 * form drops in by replacing the placeholder branch (ticket Technical Notes).
 */
function StepPlaceholder({ step }: { step: number }) {
  return (
    <div className="py-8 text-center">
      <h2 className="text-lg font-semibold text-secondary-900">{STEP_TITLES[step]}</h2>
      <p className="mt-2 text-secondary-600">
        This step is coming — we&apos;ll set up {STEP_TITLES[step].toLowerCase()} here.
      </p>
    </div>
  );
}

function stepContent(step: number) {
  switch (step) {
    case 1:
      return <Step1Preferences />;
    case 2:
      return <Step2Semester />;
    case 3:
      return <StepPlaceholder step={3} />;
    default:
      // Defensive: the backend only stores 1–3; nothing to render otherwise.
      return null;
  }
}

/**
 * Wizard shell (SP-107C): the step indicator, the step content, the footer
 * (skip from step 2 onward per D107-4 + sign-out), and the loading/error
 * states. Rendered inside the standard `Layout` `main` (D107-3).
 *
 * The page owns the state fetch and the completed redirect; the shell is a
 * presentational frame driven by the onboarding slice fields.
 */
export interface WizardShellProps {
  status: OnboardingStatus;
  step: number;
  error: string | null;
  /** Re-runs the state fetch (the error screen's "Try again"). */
  onRetryFetch: () => void;
  /** `PATCH /onboarding { completed: true }`; the page redirects on success. */
  onSkip: () => void;
  /** Sign out — the exit + resume path (signing in re-enters at the saved step). */
  onSignOut: () => void;
  /** A skip/complete write is in flight — disables the footer controls. */
  isBusy?: boolean;
}

export function WizardShell({
  status,
  step,
  error,
  onRetryFetch,
  onSkip,
  onSignOut,
  isBusy = false,
}: WizardShellProps) {
  // `idle` renders like `loading`: the page dispatches the fetch immediately
  // on mount, so the two are visually indistinguishable (no content flash).
  if (status === 'idle' || status === 'loading') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="card min-h-[50vh] flex flex-col items-center justify-center gap-4">
          {/* Announced status: screen readers hear the transition. */}
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
            <p className="text-secondary-600">Loading your setup…</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="card">
          <div role="alert" aria-live="assertive" className="space-y-4">
            <h1 className="text-2xl font-bold text-secondary-900">
              We couldn&apos;t load your setup
            </h1>
            <p className="text-secondary-600">{error || 'Something went wrong.'}</p>
            <div className="flex flex-col-reverse sm:flex-row gap-4 pt-2">
              <Button onClick={onRetryFetch}>Try again</Button>
              <Button variant="ghost" onClick={onSignOut}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // `ready` (the success state): the wizard at the stored step.
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="card">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">Set up StudyPilot</h1>
            {/* Announced on step changes so the resume/advance is perceivable. */}
            <p className="mt-1 text-secondary-600" aria-live="polite">
              Step {step} of 3: {STEP_TITLES[step]}
            </p>
          </div>
          {/* Step indicator (the current step is announced via aria-current). */}
          <ol className="flex items-center gap-2" aria-label="Setup progress">
            {[1, 2, 3].map((n) => (
              <li
                key={n}
                aria-current={n === step ? 'step' : undefined}
                className={clsx(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                  n < step && 'bg-primary-100 text-primary-700',
                  n === step && 'bg-primary-600 text-white',
                  n > step && 'bg-secondary-100 text-secondary-500'
                )}
              >
                {n}
              </li>
            ))}
          </ol>
        </div>

        {stepContent(step)}

        {/* Actionable error from the last write (e.g. a failed progress save);
            the step content stays rendered so the student can retry. */}
        {error && (
          <div role="alert" aria-live="assertive" className="mt-6 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4 border-t border-secondary-200 pt-6">
          <Button variant="ghost" onClick={onSignOut} disabled={isBusy}>
            Sign out
          </Button>
          {/* D107-4: skip is offered from step 2 onward — step 1 is required. */}
          {step >= 2 && (
            <Button variant="ghost" onClick={onSkip} disabled={isBusy}>
              Skip for now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

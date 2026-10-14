import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SessionUser } from '../types';
import { Button } from './Button';
import { resendFeedback, useResendVerification } from '../hooks/useResendVerification';

function StudentReminder({ student, dismiss }: { student: SessionUser; dismiss: () => void }) {
  const resend = useResendVerification();
  return (
    <section aria-labelledby="verification-reminder-heading" className="bg-primary-50 border-b border-primary-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <h2 id="verification-reminder-heading" className="text-lg">Verify your email</h2>
          <p className="text-sm text-secondary-700">Check your inbox for a verification link. You can keep using StudyPilot while your email is unverified.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void resend.sendEmail(student.email)} disabled={resend.isPending || resend.secondsRemaining > 0} aria-busy={resend.isPending} variant="outline" className="rounded-lg">
              {resend.isPending ? 'Requesting email…' : 'Resend verification email'}
            </Button>
            <Link className="text-sm underline rounded focus-visible:ring-2" to="/verify-email">Open verification page</Link>
          </div>
          <div role="status" aria-label="Banner resend status" aria-live="polite" aria-atomic="true" className="text-sm text-secondary-700">
            {resend.isPending ? 'Requesting a verification email…' : resend.isSuccess ? resendFeedback : ''}
          </div>
          {resend.secondsRemaining > 0 && <p className="text-sm text-secondary-700">Try again in {resend.secondsRemaining} seconds.</p>}
          {resend.error && <p role="alert" className="text-sm text-red-700">{resend.error}</p>}
        </div>
        <Button onClick={dismiss} aria-label="Dismiss email verification reminder" variant="ghost" className="rounded-lg self-start">Dismiss</Button>
      </div>
    </section>
  );
}

export function EmailVerificationBanner() {
  const { user, isLoading, isVerificationBannerDismissed, dismissVerificationBanner } = useAuth();
  if (isLoading || !user || user.emailVerifiedAt !== null || isVerificationBannerDismissed) return null;
  // Account changes reset local loading, errors and cooldown as well as dismissal.
  return <StudentReminder key={user.id} student={user} dismiss={dismissVerificationBanner} />;
}

import { useEffect, useRef, useState } from 'react';
import { useResendVerificationMutation, resendErrorMessage } from '@/features/session/api/sessionApi';

export const resendFeedback = 'If this email needs verification, a link will be sent. Check your inbox and wait a minute before requesting another.';

export function useResendVerification() {
  const [deadline, setDeadline] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const submitting = useRef(false);
  // RTK Query mutations never retry by default, matching the old `retry: false`.
  const [trigger, { isLoading, isSuccess, error }] = useResendVerificationMutation();

  useEffect(() => {
    if (!deadline) return;
    const update = () => setSecondsRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [deadline]);

  const sendEmail = async (email: string) => {
    if (submitting.current || Date.now() < deadline) return;
    submitting.current = true;
    try {
      await trigger(email.trim().toLowerCase()).unwrap();
      setDeadline(Date.now() + 60_000);
      setSecondsRemaining(60);
    } catch {
      // The sanitized mutation error is rendered by the caller.
    } finally {
      submitting.current = false;
    }
  };

  return {
    sendEmail,
    // Public contract name preserved; RTK Query calls the same flag isLoading.
    isPending: isLoading,
    isSuccess,
    error: error ? resendErrorMessage(error.code) : undefined,
    secondsRemaining,
  };
}

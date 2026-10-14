import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/auth';

export const resendFeedback = 'If this email needs verification, a link will be sent. Check your inbox and wait a minute before requesting another.';

export function useResendVerification() {
  const [deadline, setDeadline] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const submitting = useRef(false);
  const mutation = useMutation({
    mutationFn: (email: string) => authService.resendVerification(email),
    retry: false,
    onSuccess: () => {
      setDeadline(Date.now() + 60_000);
      setSecondsRemaining(60);
    },
  });

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
      await mutation.mutateAsync(email.trim().toLowerCase());
    } catch {
      // The sanitized mutation error is rendered by the caller.
    } finally {
      submitting.current = false;
    }
  };

  return {
    sendEmail,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error?.message,
    secondsRemaining,
  };
}

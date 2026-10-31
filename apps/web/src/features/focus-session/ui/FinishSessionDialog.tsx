import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Input } from '@/shared/ui/Input';
import { getErrorMessage, extractApiError } from '@/shared/lib/errors';
import { finishStudySession } from '@/entities/study-session/api/studySessionApi';
import { listAssignments } from '@/entities/assignment/api/assignmentApi';
import type { StudySession } from '@/entities/study-session/model/types';
import type { AssignmentListItem } from '@/shared/types/academic';
import { getBrowserTimeZone, formatDate } from '@/shared/lib/datetime';

export interface FinishSessionAssignment {
  id?: string;
  title: string;
  dueDate: string | null;
  estimatedHours: number | null;
}

export interface FinishSessionDialogProps {
  session: StudySession | null;
  open: boolean;
  onClose: () => void;
  onFinished: (session: StudySession) => void;
  onReload?: () => void;
  assignment?: FinishSessionAssignment | null;
}

export function FinishSessionDialog({
  session,
  open,
  onClose,
  onFinished,
  onReload,
  assignment: assignmentProp,
}: FinishSessionDialogProps) {
  const [inputValue, setInputValue] = useState<string>('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const isFinishingRef = useRef(false);
  const [resolvedAssignment, setResolvedAssignment] = useState<FinishSessionAssignment | null>(
    assignmentProp ?? null
  );

  const recordedMinutes = session ? Math.round(session.elapsedSeconds / 60) : 0;

  useEffect(() => {
    if (open) {
      setInputValue(String(recordedMinutes));
      setFieldError(null);
      setAlertError(null);
      setConflict(false);
      setIsFinishing(false);
      isFinishingRef.current = false;
      setResolvedAssignment(assignmentProp ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session?.id, assignmentProp]);

  // Resolve assignment context when not supplied (non-fatal).
  useEffect(() => {
    if (!open) return;
    if (assignmentProp) {
      setResolvedAssignment(assignmentProp);
      return;
    }
    const id = session?.assignmentId;
    if (!id) {
      setResolvedAssignment(null);
      return;
    }
    let cancelled = false;
    listAssignments()
      .then((list) => {
        if (cancelled) return;
        const found = list.find((a: AssignmentListItem) => a.id === id);
        if (found) {
          setResolvedAssignment({
            id: found.id,
            title: found.title,
            dueDate: found.dueDate,
            estimatedHours: found.estimatedHours,
          });
        } else {
          setResolvedAssignment(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setResolvedAssignment(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, session?.assignmentId, assignmentProp]);

  const numeric = inputValue === '' ? NaN : Number(inputValue);
  const isValid = Number.isInteger(numeric) && numeric >= 0 && numeric <= 1440;
  const validationError = isValid ? null : 'Enter a whole number between 0 and 1440.';

  const handleClose = () => {
    if (isFinishing) return;
    setFieldError(null);
    setAlertError(null);
    setConflict(false);
    onClose();
  };

  const handleConfirm = async () => {
    if (!session || isFinishingRef.current || !isValid) return;
    isFinishingRef.current = true;
    setIsFinishing(true);
    setFieldError(null);
    setAlertError(null);
    setConflict(false);
    try {
      const result = await finishStudySession(session.id, numeric);
      onFinished(result);
      onClose();
    } catch (err) {
      const apiErr = extractApiError(err);
      if (apiErr?.statusCode === 400 && apiErr.errors?.confirmedMinutes) {
        setFieldError(apiErr.errors.confirmedMinutes.join(' '));
      } else if (apiErr?.statusCode === 409) {
        setConflict(true);
        setAlertError(
          typeof apiErr.message === 'string' && apiErr.message.length > 0
            ? apiErr.message
            : 'This session changed. Reload to continue.'
        );
      } else {
        setAlertError(getErrorMessage(err) || 'Something went wrong. Try again.');
      }
    } finally {
      isFinishingRef.current = false;
      setIsFinishing(false);
      isFinishingRef.current = false;
    }
  };

  const handleReload = () => {
    if (onReload) onReload();
    onClose();
  };

  const timeZone = getBrowserTimeZone();
  const assignment = resolvedAssignment;

  const metaParts: string[] = [];
  if (assignment) {
    metaParts.push(
      `Due ${assignment.dueDate ? formatDate(new Date(assignment.dueDate), timeZone) : 'No due date'}`
    );
    if (assignment.estimatedHours != null) {
      metaParts.push(`${assignment.estimatedHours}h estimated`);
    }
    if (session?.plannedMinutes != null) {
      metaParts.push(`Target ${session.plannedMinutes} min`);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Finish this session"
      description="Confirm or adjust the time you want to record."
      size="sm"
      disableBackdropClose={isFinishing}
    >
      {assignment ? (
        <div className="mb-4">
          <p className="font-semibold text-text">{assignment.title}</p>
          <p className="text-sm text-text-muted">{metaParts.join(' · ')}</p>
        </div>
      ) : session?.assignmentId ? (
        <p className="mb-4 text-sm text-text-muted">Loading assignment…</p>
      ) : (
        <p className="mb-4 text-sm text-text-muted">No assignment linked to this session.</p>
      )}

      <div className="mb-4 rounded-lg border border-border bg-surface-muted p-3">
        <p className="text-sm text-text-muted">Recorded time</p>
        <p className="text-lg font-semibold text-text">{recordedMinutes} min</p>
      </div>

      <Input
        type="number"
        label="Minutes to record"
        min={0}
        max={1440}
        step={1}
        inputMode="numeric"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setFieldError(null);
        }}
        onFocus={(e) => e.target.select()}
        disabled={isFinishing}
        error={fieldError ?? validationError ?? undefined}
        hint={fieldError || validationError ? undefined : 'Between 0 and 1440 minutes.'}
      />

      {alertError && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
        >
          <p>{alertError}</p>
          {conflict && onReload && (
            <div className="mt-2">
              <Button size="sm" variant="secondary" onClick={handleReload}>
                Reload session
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={handleClose} disabled={isFinishing}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          isLoading={isFinishing}
          disabled={isFinishing || !isValid}
          aria-busy={isFinishing || undefined}
          onClick={handleConfirm}
        >
          Save time
        </Button>
      </div>
    </Dialog>
  );
}

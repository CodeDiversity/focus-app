import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Input } from '@/shared/ui/Input';
import { useSelector } from 'react-redux';
import { selectUser } from '@/features/session/model/authSlice.selectors';
import { getBrowserTimeZone, formatDate } from '@/shared/lib/datetime';
import { resolveDefaultSessionMinutes } from '../model/resolveDefaultSessionMinutes';
import { useStartFocusSession } from '../model/useStartFocusSession';

export interface StartFocusSessionAssignment {
  id: string;
  title: string;
  dueDate: string | null;
  estimatedHours: number | null;
}

export interface StartFocusSessionDialogProps {
  assignment: StartFocusSessionAssignment | null;
  open: boolean;
  onClose: () => void;
}

const PRESETS = [25, 50, 90];

export function StartFocusSessionDialog({
  assignment,
  open,
  onClose,
}: StartFocusSessionDialogProps) {
  const user = useSelector(selectUser);
  const defaultMinutes = resolveDefaultSessionMinutes(user);
  const [duration, setDuration] = useState<number>(defaultMinutes);

  const { isStarting, error, conflict, start, viewCurrentSession, clearError } =
    useStartFocusSession(assignment?.id ?? null, onClose);

  useEffect(() => {
    if (open) {
      setDuration(defaultMinutes);
      clearError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assignment?.id, defaultMinutes]);

  const isValid = Number.isInteger(duration) && duration >= 5 && duration <= 480;
  const validationError = isValid ? null : 'Duration must be between 5 and 480 minutes.';

  const isCustomDefault = !PRESETS.includes(defaultMinutes);
  const hint = isCustomDefault
    ? `Your default: ${defaultMinutes} minutes.`
    : 'Between 5 and 480 minutes.';

  const handleClose = () => {
    if (isStarting) return;
    clearError();
    onClose();
  };

  const handleConfirm = () => {
    if (conflict) {
      viewCurrentSession();
      return;
    }
    if (!isValid || isStarting) return;
    void start(duration);
  };

  const timeZone = getBrowserTimeZone();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Start a focus session"
      description="Choose how long you want to focus on this assignment."
      size="sm"
      disableBackdropClose={isStarting}
    >
      {assignment && (
        <div className="mb-4">
          <p className="font-semibold text-text">{assignment.title}</p>
          <p className="text-sm text-text-muted">
            Due{' '}
            {assignment.dueDate
              ? formatDate(new Date(assignment.dueDate), timeZone)
              : 'No due date'}
            {assignment.estimatedHours != null && ` · ${assignment.estimatedHours}h estimated`}
          </p>
        </div>
      )}

      <div className="mb-2 text-sm font-medium text-text">Duration</div>
      <div className="mb-2 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <div key={preset} className="flex flex-col items-center">
            <Button
              type="button"
              size="sm"
              variant={duration === preset ? 'primary' : 'secondary'}
              disabled={isStarting}
              onClick={() => setDuration(preset)}
            >
              {preset}
            </Button>
            {preset === defaultMinutes && (
              <span className="mt-1 text-xs text-text-muted">Your default</span>
            )}
          </div>
        ))}
      </div>

      <Input
        type="number"
        label="Duration"
        aria-label="Duration in minutes"
        min={5}
        max={480}
        step={5}
        value={Number.isNaN(duration) ? '' : duration}
        onChange={(e) => {
          const v = e.target.value;
          setDuration(v === '' ? NaN : Number(v));
        }}
        disabled={isStarting}
        error={validationError ?? undefined}
        hint={validationError ? undefined : hint}
      />

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
        >
          <p>{error}</p>
          {conflict && (
            <p className="mt-1">Finish your open session first, then start a new one.</p>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={handleClose} disabled={isStarting}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          isLoading={isStarting}
          disabled={isStarting || (!conflict && !isValid)}
          onClick={handleConfirm}
        >
          {conflict ? 'View current session' : isStarting ? 'Starting…' : 'Start focus session'}
        </Button>
      </div>
    </Dialog>
  );
}

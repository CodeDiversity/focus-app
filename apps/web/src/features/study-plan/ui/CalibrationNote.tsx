import type { CalibrationAnnotation } from '@/entities/study-plan/model/types';
import { calibrationSentence } from '@/features/study-plan/lib/calibrationCopy';

export interface CalibrationNoteProps {
  calibration?: CalibrationAnnotation[];
  className?: string;
}

/**
 * EP13L — the explainable annotation where calibrated estimates are shown
 * (plan preview, remaining work). One plain sentence per multiplier (D-L4);
 * renders nothing for the uncalibrated student (EP13L-AC3 — no annotation
 * noise). Plain text, no colour-only meaning, announced as a note.
 */
export function CalibrationNote({ calibration, className }: CalibrationNoteProps) {
  const list = calibration ?? [];
  if (list.length === 0) return null;

  return (
    <div
      role="note"
      aria-label="How your estimates were adjusted"
      data-testid="calibration-note"
      className={['text-sm text-text-muted', className].filter(Boolean).join(' ')}
    >
      {list.length === 1 ? (
        <p>{calibrationSentence(list[0])}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5">
          {list.map((a) => (
            <li key={a.assignmentType ?? 'overall'}>{calibrationSentence(a)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CalibrationNote;

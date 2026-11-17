import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Button } from '@/shared/ui/Button';

export interface WeeklyChoicePromptProps {
  /** One sentence of context, e.g. "This repeats weekly. Apply your change to:". */
  question: string;
  onThisDay: () => void;
  onFollowing: () => void;
  /** Returns to what was underneath, unchanged; Escape does the same. */
  onBack: () => void;
  busy?: boolean;
}

/**
 * The one question with two answers (EP15G-AC2, D15-5, D15-14 rule 5).
 * Rendered **inside** the open dialog in place of its body and footer —
 * never a stacked dialog. Focus lands on "Just this day"; Escape is "Back"
 * (stopped here so the host dialog does not close instead).
 */
export function WeeklyChoicePrompt({
  question,
  onThisDay,
  onFollowing,
  onBack,
  busy,
}: WeeklyChoicePromptProps) {
  const firstRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    firstRef.current?.focus();
  }, []);
  // On the buttons themselves (focus is always on one of them), so no wrapper needs a role.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape' && !busy) {
      e.preventDefault();
      e.stopPropagation();
      onBack();
    }
  };
  return (
    <div className="space-y-4" data-testid="weekly-choice-prompt">
      <p className="text-body-sm text-text">{question}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          ref={firstRef}
          type="button"
          variant="outline"
          onClick={onThisDay}
          onKeyDown={onKeyDown}
          disabled={busy}
          className="max-sm:min-h-[44px]"
        >
          Just this day
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onFollowing}
          onKeyDown={onKeyDown}
          disabled={busy}
          className="max-sm:min-h-[44px]"
        >
          This and following
        </Button>
      </div>
      <div className="flex justify-start">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          onKeyDown={onKeyDown}
          disabled={busy}
          className="max-sm:min-h-[44px]"
        >
          Back
        </Button>
      </div>
    </div>
  );
}

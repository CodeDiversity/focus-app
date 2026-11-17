import { useState } from 'react';
import { Sunrise, X } from 'lucide-react';
import type { DayBoundsResult } from '@/entities/day-bounds/model/types';

export const BANNER_DISMISSED_KEY = 'sp.dayBoundsBannerDismissed';

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(BANNER_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export interface DayBoundsBannerProps {
  bounds: DayBoundsResult | null;
  /** Open the sheet; receives the trigger so focus can return to it. */
  onOpen: () => void;
}

/**
 * The first-run nudge (EP15F-AC1; D15-14 rule 4 — never a modal, never
 * blocking): one line while bounds are unconfigured, a "Set it" button and
 * a dismiss control. Dismissing hides it for the session (D-F1,
 * `sessionStorage`); it disappears for good once bounds are saved
 * (`configured: true`).
 */
export function DayBoundsBanner({ bounds, onOpen }: DayBoundsBannerProps) {
  const [dismissed, setDismissed] = useState(readDismissed);
  if (!bounds || bounds.configured || dismissed) return null;
  const first = bounds.days[0];
  const range = first ? `${first.wakeTime}–${first.sleepTime}` : '08:00–23:00';

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(BANNER_DISMISSED_KEY, '1');
    } catch {
      /* storage unavailable: hide for this render only */
    }
    setDismissed(true);
  };

  return (
    <div
      data-testid="day-bounds-banner"
      className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 text-sm text-text"
    >
      <Sunrise aria-hidden size={16} className="shrink-0 text-accent" />
      <p className="min-w-0 flex-1">
        Your days run {range} for now. When does your day usually start and end?{' '}
        <button
          type="button"
          onClick={onOpen}
          className="font-semibold text-accent underline underline-offset-2 hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 max-sm:min-h-[44px]"
        >
          Set it
        </button>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring max-sm:h-11 max-sm:w-11"
      >
        <X aria-hidden size={16} />
      </button>
    </div>
  );
}

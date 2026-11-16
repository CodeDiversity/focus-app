import { CheckCircle2 } from 'lucide-react';
import type { MomentumSummary } from '@/entities/study-session/model/types';
import { WEEKDAY_SHORT, studiedOnSentence, weekDates } from '../model/momentumCopy';

/**
 * EP13K — the seven Mon…Sun day marks. Decorative (`aria-hidden`); the
 * adjacent sr-only sentence carries the meaning, and a study day is marked
 * by an icon plus fill — never colour alone.
 */
export function MomentumWeekStrip({
  momentum,
  compact = false,
}: {
  momentum: MomentumSummary;
  compact?: boolean;
}) {
  const studied = new Set(momentum.week.studyDays);
  return (
    <>
      <ol aria-hidden className="flex gap-1" data-testid="momentum-week-strip">
        {weekDates(momentum.week.startDate).map((date, i) => {
          const didStudy = studied.has(date);
          const isToday = date === momentum.date;
          return (
            <li
              key={date}
              data-studied={didStudy ? 'true' : 'false'}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md border ${
                compact ? 'min-h-[36px] py-1' : 'min-h-[44px] py-1.5'
              } ${didStudy ? 'border-success/40 bg-success/10' : 'border-border bg-surface-muted'} ${
                isToday ? 'ring-2 ring-accent/60' : ''
              }`}
            >
              {didStudy ? (
                <CheckCircle2 size={16} className="text-success" />
              ) : (
                <span className="block h-4 w-4 rounded-full border border-border" />
              )}
              <span className="text-xs text-text-muted">{WEEKDAY_SHORT[i]}</span>
            </li>
          );
        })}
      </ol>
      <p className="sr-only">{studiedOnSentence(momentum)}</p>
    </>
  );
}

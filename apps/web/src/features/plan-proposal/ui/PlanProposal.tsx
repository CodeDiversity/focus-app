import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getBrowserTimeZone } from '@/shared/lib/datetime';
import { CONFLICT_REASON_LABEL } from '@/entities/study-plan/model/types';
import { PlanWeek } from '@/features/study-plan/ui/PlanWeek';
import { PlanSessionEditor } from '@/features/study-plan/ui/PlanSessionEditor';
import { WorkloadWarnings } from '@/features/study-plan/ui/WorkloadWarnings';
import { CalibrationNote } from '@/features/study-plan/ui/CalibrationNote';
import { formatMinutes } from '@/features/study-plan/lib/formatMinutes';
import { weekLine } from '@/features/study-plan/lib/weekLine';
import { todayPlanApi } from '@/features/today-plan/api/todayPlanApi';
import { calendarApi } from '@/features/calendar/api/calendarApi';
import { recoverySummaryApi } from '@/features/today/api/recoverySummaryApi';
// RD7: sanctioned features → app import for typed dispatch hook
// eslint-disable-next-line import/no-restricted-paths
import { useAppDispatch } from '@/app/store/hooks';
import { useProposal } from '../model/useProposal';
import { WhatThisKeepsCard } from './WhatThisKeepsCard';
import { MovedForwardList } from './MovedForwardList';

/**
 * EP16C — the one proposal surface at `/plan/proposal` (D16-4, D16-5, D-C1,
 * D-C6): header (`h1` "Your proposed week", window line, **Use this plan**,
 * **Not now**) → rolled-over banner → calibration note → the week →
 * the editor → conflicts → What this plan keeps → Moved forward into this
 * plan → workload warnings. Confirming lands on Today (D-C2); Not now
 * returns to `/plan` with no request. Focus lands on the `h1` on entry and
 * again after a reload (Try again / Create new plan), because the control
 * that had focus disappears.
 *
 * D-C12 (EP16C implementer, ADHD): one sentence under the heading — "5
 * sessions · about 4 h this week" — lets a student judge the proposal before
 * reading the grid. It is a paragraph, never a heading (copy rules).
 */
export const PROPOSAL_TITLE = 'Your proposed week';

export function proposalSummary(sessionCount: number, totalMinutes: number): string {
  const sessions = `${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'}`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const time =
    hours > 0 ? (minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`) : formatMinutes(minutes);
  return `${sessions} · about ${time} this week`;
}

export function PlanProposal() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const {
    preview,
    edited,
    phase,
    isConfirming,
    conflicts,
    rolledOver,
    load,
    confirm,
    setEdited,
    onLockedChange,
  } = useProposal({
    onConfirmed: () => {
      // F-EP16F-02: the confirm writes through the entity client, not RTK
      // Query, so the caches Today reads (today's plan, the calendar's
      // events, the plan note's summary) would serve the pre-plan result for
      // up to 60 s. Drop them before landing on Today.
      dispatch(todayPlanApi.util.resetApiState());
      dispatch(calendarApi.util.resetApiState());
      dispatch(recoverySummaryApi.util.resetApiState());
      navigate('/today');
    },
  });

  // Focus the heading on entry and whenever a reload settles (the control that
  // had focus — Try again / Create new plan — is gone by then).
  useEffect(() => {
    if (phase !== 'loading') headingRef.current?.focus();
  }, [phase]);

  const lockedMissedSessions = preview?.missedSessions.filter((m) => m.locked) ?? [];
  const isEmpty = !!preview && preview.days.every((d) => d.sessions.length === 0);
  const totalMinutes = edited.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <section aria-labelledby="plan-proposal-heading">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1
            id="plan-proposal-heading"
            tabIndex={-1}
            ref={headingRef}
            className="text-3xl font-bold text-text focus:outline-none"
          >
            {PROPOSAL_TITLE}
          </h1>
          {preview ? (
            <p className="text-sm text-text-muted">
              {weekLine(preview.from, preview.to, preview.timeZone, getBrowserTimeZone())}
            </p>
          ) : null}
          {preview && !isEmpty ? (
            <p className="mt-1 text-sm text-text" data-testid="proposal-summary">
              {proposalSummary(edited.length, totalMinutes)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {preview ? (
            <Button
              onClick={() => void confirm()}
              disabled={isConfirming}
              isLoading={isConfirming}
              className="w-full sm:w-auto max-sm:min-h-[44px]"
            >
              Use this plan
            </Button>
          ) : null}
          <Button
            variant="ghost"
            onClick={() => navigate('/plan')}
            className="w-full sm:w-auto max-sm:min-h-[44px]"
          >
            Not now
          </Button>
        </div>
      </div>

      {rolledOver ? (
        <div role="alert" className="mb-4 card border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm text-text">
            This proposal&apos;s week has ended. Create a new plan for this week.
          </p>
          <Button className="mt-2 max-sm:min-h-[44px]" onClick={() => void load()}>
            Create new plan
          </Button>
        </div>
      ) : null}

      {phase === 'loading' ? (
        <div className="card p-4 sm:p-6" aria-busy="true">
          <div className="grid grid-cols-7 gap-2 overflow-x-auto">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="min-w-[140px] space-y-2 rounded-lg border border-border p-2">
                {Array.from({ length: 3 }).map((__, j) => (
                  <div
                    key={j}
                    className="h-12 animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {phase === 'error' ? (
        <Card role="alert" className="border border-danger/30 bg-danger/10 p-6">
          <p className="text-sm text-danger-strong">
            We couldn&apos;t build a plan proposal. Try again.
          </p>
          <Button className="mt-4 max-sm:min-h-[44px]" onClick={() => void load()}>
            Try again
          </Button>
        </Card>
      ) : null}

      {phase === 'ready' && preview ? (
        <>
          {/* EP13L (D-L4): explain the longer figures before they are read. */}
          <CalibrationNote calibration={preview.calibration} className="mb-4" />

          {isEmpty ? (
            <EmptyState
              title="Nothing new to schedule"
              description="Your unfinished work didn't need any new sessions this week. Check the workload warnings below."
            />
          ) : (
            <>
              <PlanWeek
                days={preview.days.map((d) => ({
                  date: d.date,
                  sessions: d.sessions.map((s) => ({
                    assignmentTitle: s.assignmentTitle,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    durationMinutes: s.durationMinutes,
                    anchor: s.anchor,
                    windowHint: s.windowHint,
                  })),
                }))}
                timeZone={preview.timeZone}
              />
              <PlanSessionEditor
                className="mt-6"
                sessions={edited}
                days={preview.days.map((d) => d.date)}
                onChange={setEdited}
                conflicts={conflicts}
              />
              {conflicts.length > 0 ? (
                <div
                  role="alert"
                  className="mt-4 card border border-danger/30 bg-danger/10 p-4"
                  data-testid="conflict-summary"
                >
                  {/* F-EP16F-04: `danger-strong` keeps 4.5:1 on the 10% danger tint. */}
                  <p className="text-sm font-medium text-danger-strong">
                    Some sessions clash with your calendar. Adjust them and try again:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-danger-strong">
                    {conflicts.map((c, i) => (
                      <li key={i}>
                        {c.date} {c.startTime} — {CONFLICT_REASON_LABEL[c.reason] ?? c.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}

          <WhatThisKeepsCard
            className="mt-6"
            lockedPreserved={preview.lockedPreserved}
            completedPreserved={preview.completedPreserved}
            lockedSessions={lockedMissedSessions}
            onLockedChange={onLockedChange}
          />

          <div className="mt-6">
            <MovedForwardList sessions={preview.missedSessions} />
          </div>

          <WorkloadWarnings
            className="mt-6"
            warnings={preview.warnings}
            deferred={preview.deferred}
          />
        </>
      ) : null}
    </section>
  );
}

export default PlanProposal;

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Disclosure } from '@/shared/ui/Disclosure';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getBrowserTimeZone } from '@/shared/lib/datetime';
import { MD_UP_QUERY, useMediaQuery } from '@/shared/lib/useMediaQuery';
import { CONFLICT_REASON_LABEL } from '@/entities/study-plan/model/types';
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
import { EditableWeek } from './EditableWeek';
import { ProposalActionBar } from './ProposalActionBar';
import { PacingControls } from './PacingControls';
import { WhatThisKeepsCard } from './WhatThisKeepsCard';
import { MovedForwardList } from './MovedForwardList';

/**
 * EP16C → EP17F — the one proposal surface at `/plan/proposal`, composed
 * around the decision (▲ D-F1/▲ D-F2, replacing EP16C's D-C6 order). Four
 * regions, in rank order:
 *
 *   1. judge the week — `h1`, window line, the one pacing sentence
 *      (+ EP17G's control slot under it);
 *   2. change the week — EP17E's `EditableWeek`;
 *   3. what will not happen — the conflict summary then `WorkloadWarnings`,
 *      always visible at every width (▲ D-F2: a hidden warning is a promise
 *      quietly broken);
 *   4. reassurance and context — one "What else changed" disclosure holding
 *      `CalibrationNote`, `WhatThisKeepsCard` and `MovedForwardList`, open by
 *      default at `md`+ and collapsed below it (▲ D-F7: no auto-expand rule).
 *
 * **Use this plan** / **Not now** render once, in the fixed bottom
 * `ProposalActionBar` (AC-E17-11) — reachable from the editing area at every
 * scroll position; the section reserves `pb-24` so the bar never covers the
 * last day (D-F5). Confirming lands on Today (D-C2); Not now returns to
 * `/plan` with no request. Focus lands on the `h1` on entry and again after a
 * reload (Try again / Create new plan), because the control that had focus
 * disappears.
 *
 * D-C12 (EP16C implementer, ADHD) + EP17F D-F3: one sentence under the
 * heading — "5 sessions · about 4 h this week · spread across 3 days" — lets
 * a student judge the proposal before reading the grid. It is a paragraph,
 * never a heading (copy rules; `%` is forbidden, so the spread lever is never
 * shown as a percentage here).
 */
export const PROPOSAL_TITLE = 'Your proposed week';

export function proposalSummary(
  sessionCount: number,
  totalMinutes: number,
  studyDayCount?: number
): string {
  const sessions = `${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'}`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const time =
    hours > 0 ? (minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`) : formatMinutes(minutes);
  const base = `${sessions} · about ${time} this week`;
  // EP17F (D-F3): optional third part from the `pacing` block — absent, the
  // pre-EP17D sentence stays byte-identical. `studyDayCount` is the
  // *selected* day set's size (contracts §5, ▲ D-D1), hence "spread across".
  if (studyDayCount === undefined) return base;
  return studyDayCount === 1
    ? `${base} · on 1 day`
    : `${base} · spread across ${studyDayCount} days`;
}

export function PlanProposal() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // ▲ D-F2/D-F7: the reassurance disclosure starts open at `md`+, collapsed
  // below. `useSyncExternalStore`'s first render is synchronous — no flash.
  const mdUp = useMediaQuery(MD_UP_QUERY, true);
  // EP17G (D-G8): "Change the pace" is open at `md`+ and collapsed below —
  // six radio cards between the summary and the week on a 360 px phone is the
  // density the epic's ADHD standard rejects.
  const pacingOpen = useMediaQuery(MD_UP_QUERY, false);
  const {
    preview,
    edited,
    phase,
    isConfirming,
    conflicts,
    rolledOver,
    isReplanning,
    load,
    replan,
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
  const hasContext =
    !!preview &&
    (preview.calibration.length > 0 ||
      preview.missedSessions.length > 0 ||
      preview.lockedPreserved > 0 ||
      preview.completedPreserved > 0);

  return (
    // pb-24: room for the fixed action bar (D-F5) — the last day of the week
    // is never underneath it.
    <section
      aria-labelledby="plan-proposal-heading"
      className="pb-24"
      // EP17G-AC3: the whole proposal is busy while a plan-time change is
      // being saved and the week rebuilt.
      aria-busy={isReplanning || undefined}
    >
      {/* Region 1 — judge the week. The decision buttons left the header for
          the ProposalActionBar (▲ D-F1); EP17G's pacing controls sit under the
          pacing sentence, behind the "Change the pace" disclosure. */}
      <div className="mb-6 min-w-0">
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
            {proposalSummary(edited.length, totalMinutes, preview.pacing?.studyDays.length)}
          </p>
        ) : null}
        {/* EP17G (D-G3 (a), D-G8) — the levers sit under the pacing sentence
            that states the symptom. They need the effective values, so they
            render only once a `pacing` block has arrived. */}
        {phase === 'ready' && preview?.pacing ? (
          <Disclosure
            id="proposal-pacing"
            label="Change the pace"
            defaultOpen={pacingOpen}
            className="mt-3"
          >
            <PacingControls pacing={preview.pacing} onChanged={replan} disabled={isConfirming} />
          </Disclosure>
        ) : null}
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
          {/* Region 2 — change the week. */}
          {isEmpty ? (
            <EmptyState
              title="Nothing new to schedule"
              description="Your unfinished work didn't need any new sessions this week. Check the workload warnings below."
            />
          ) : (
            <EditableWeek
              sessions={edited}
              days={preview.days.map((d) => d.date)}
              onChange={setEdited}
              conflicts={conflicts}
              timeZone={preview.timeZone}
            />
          )}

          {/* Region 3 — what will not happen: always visible (▲ D-F2).
              EP16K's "a 409 forces the disclosure open" rule is retired —
              nothing here can be hidden in the first place. */}
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

          <WorkloadWarnings
            className="mt-6"
            warnings={preview.warnings}
            deferred={preview.deferred}
          />

          {/* Region 4 — reassurance and context (▲ D-F2 (a), ▲ D-F7 (a)): the
              calibration note (EP13L D-L4), what the plan keeps and what it
              moved forward, behind one labelled disclosure. */}
          {hasContext ? (
            <Disclosure
              id="proposal-context"
              label="What else changed"
              defaultOpen={mdUp}
              className="mt-6"
            >
              <CalibrationNote calibration={preview.calibration} className="mb-4" />
              <WhatThisKeepsCard
                lockedPreserved={preview.lockedPreserved}
                completedPreserved={preview.completedPreserved}
                lockedSessions={lockedMissedSessions}
                onLockedChange={onLockedChange}
              />
              <div className="mt-6">
                <MovedForwardList sessions={preview.missedSessions} />
              </div>
            </Disclosure>
          ) : null}
        </>
      ) : null}

      <ProposalActionBar
        showConfirm={!!preview}
        isConfirming={isConfirming}
        // EP17G-AC3: confirming a week that is being rebuilt would save the
        // one on its way out.
        confirmDisabled={isReplanning}
        onConfirm={() => void confirm()}
        onDecline={() => navigate('/plan')}
      />
    </section>
  );
}

export default PlanProposal;

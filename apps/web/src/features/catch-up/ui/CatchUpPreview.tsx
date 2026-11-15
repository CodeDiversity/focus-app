import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getErrorMessage } from '@/shared/lib/errors';
import { previewCatchUp, confirmCatchUpPlan } from '@/entities/study-plan/api/studyPlanApi';
import type {
  CatchUpPreview as CatchUpPreviewData,
  ProposedSession,
  PlanConflict,
} from '@/entities/study-plan/model/types';
import { CONFLICT_REASON_LABEL } from '@/entities/study-plan/model/types';
import { flattenPreview, projectSessions } from '@/features/study-plan/lib/preview';
import { PlanWeek } from '@/features/study-plan/ui/PlanWeek';
import { PlanSessionEditor } from '@/features/study-plan/ui/PlanSessionEditor';
import { WorkloadWarnings } from '@/features/study-plan/ui/WorkloadWarnings';
import { CatchUpPreservationCard } from './CatchUpPreservationCard';

type Phase = 'loading' | 'ready' | 'error';

/**
 * The catch-up preview / edit / confirm / decline surface (EP08E), at the
 * nested route `/plan/health/catch-up` since EP13E reframed the standalone
 * catch-up entry as plan health (D-E14 — the flow itself is unchanged; only
 * its home and its return targets moved). Flow-local state only (the PlanPage
 * pattern — no store): the preview is a client-held proposal; confirming
 * posts the (possibly edited) sessions as the exact four-field change set,
 * declining (`Not now` or browser back) makes no request and discards the
 * preview on unmount (the preview endpoint is side-effect-free, V-08-4).
 *
 * Layout order (decision 17): header (title + window + confirm/decline) →
 * proposed week grid → editable session list → preservation card →
 * workload warnings. Focus moves to the `<h1>` on route entry (decision 20).
 */
export function CatchUpPreview() {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<CatchUpPreviewData | null>(null);
  const [edited, setEdited] = useState<ProposedSession[]>([]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [isConfirming, setIsConfirming] = useState(false);
  const [conflicts, setConflicts] = useState<PlanConflict[]>([]);
  const [rolledOver, setRolledOver] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const load = useCallback(async () => {
    setPhase('loading');
    setConflicts([]);
    setRolledOver(false);
    try {
      const p = await previewCatchUp();
      setPreview(p);
      setEdited(flattenPreview(p));
      setPhase('ready');
    } catch {
      setPreview(null);
      setEdited([]);
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleConfirm = useCallback(async () => {
    if (!preview) return;
    setIsConfirming(true);
    setConflicts([]);
    try {
      await confirmCatchUpPlan(preview.from, preview.to, projectSessions(edited));
      toast.success('Catch-up plan saved.');
      navigate('/plan/health');
    } catch (err) {
      const data = (err as { response?: { data?: { error?: string; conflicts?: PlanConflict[] } } })
        ?.response?.data;
      if (data?.error === 'WINDOW_ROLLED_OVER') {
        // The window is gone; the server message says so — edits are discarded.
        setRolledOver(true);
        setPreview(null);
        setEdited([]);
        return;
      }
      if (data?.conflicts && data.conflicts.length > 0) {
        // Edits are preserved; the offending rows are marked in the editor.
        setConflicts(data.conflicts);
        const summary = data.conflicts
          .map((c) => `${c.date} ${c.startTime} — ${CONFLICT_REASON_LABEL[c.reason] ?? c.reason}`)
          .join('; ');
        toast.error(`Confirm rejected: ${summary}`);
        return;
      }
      toast.error(getErrorMessage(err) || 'We could not save your catch-up plan. Try again.');
    } finally {
      setIsConfirming(false);
    }
  }, [preview, edited, navigate]);

  /** A persisted lock flip syncs the card list and the displayed count (±1). */
  const handleLockedChange = useCallback((sessionId: string, nextLocked: boolean) => {
    setPreview((p) => {
      if (!p) return p;
      return {
        ...p,
        missedSessions: p.missedSessions.map((m) =>
          m.id === sessionId ? { ...m, locked: nextLocked } : m
        ),
        lockedPreserved: Math.max(0, p.lockedPreserved + (nextLocked ? 1 : -1)),
      };
    });
  }, []);

  const lockedMissedSessions = preview?.missedSessions.filter((m) => m.locked) ?? [];
  const isEmpty = !!preview && preview.days.every((d) => d.sessions.length === 0);

  return (
    <section aria-labelledby="catch-up-preview-heading">
      <div className="mb-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            id="catch-up-preview-heading"
            tabIndex={-1}
            ref={headingRef}
            className="text-3xl font-bold text-text focus:outline-none"
          >
            Catch-up plan
          </h1>
          {preview ? (
            <p className="text-sm text-text-muted">
              {preview.from} – {preview.to} · {preview.timeZone}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
          {preview ? (
            <Button
              onClick={() => void handleConfirm()}
              disabled={isConfirming}
              isLoading={isConfirming}
              className="w-full sm:w-auto"
            >
              Use this plan
            </Button>
          ) : null}
          <Button
            variant="ghost"
            onClick={() => navigate('/plan/health')}
            className="w-full sm:w-auto"
          >
            Not now
          </Button>
        </div>
      </div>

      {rolledOver ? (
        <div role="alert" className="mb-4 card border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm text-text">
            The plan week has rolled over — generate a new proposal to save it.
          </p>
          <Button className="mt-2" onClick={() => void load()}>
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
          <p className="text-sm text-danger">We couldn&apos;t build a catch-up plan. Try again.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => void load()}>Try again</Button>
            <Button variant="outline" onClick={() => navigate('/plan/health')}>
              Back to plan health
            </Button>
          </div>
        </Card>
      ) : null}

      {phase === 'ready' && preview ? (
        <>
          {isEmpty ? (
            <EmptyState
              title="Nothing new to schedule"
              description="Your unfinished work didn't need any new sessions this week. Check the workload warnings below."
              action={
                <Button variant="secondary" onClick={() => navigate('/plan/health')}>
                  Back to plan health
                </Button>
              }
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
                  <p className="text-sm font-medium text-danger">
                    Some sessions clash with your calendar. Adjust them and try again:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-danger">
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

          <CatchUpPreservationCard
            className="mt-6"
            lockedPreserved={preview.lockedPreserved}
            completedPreserved={preview.completedPreserved}
            lockedSessions={lockedMissedSessions}
            onLockedChange={handleLockedChange}
          />

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

export default CatchUpPreview;

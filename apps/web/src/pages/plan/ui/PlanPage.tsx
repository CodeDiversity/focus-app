import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/lib/errors';
import {
  previewStudyPlan,
  saveStudyPlan,
  listStudyPlan,
} from '@/entities/study-plan/api/studyPlanApi';
import type {
  PlanPreview,
  SavedPlan,
  ProposedSession,
  PlanConflict,
  ProposedSessionInput,
} from '@/entities/study-plan/model/types';
import { CONFLICT_REASON_LABEL } from '@/entities/study-plan/model/types';
import { PlanWeek } from '@/features/study-plan/ui/PlanWeek';
import { PlanSessionEditor } from '@/features/study-plan/ui/PlanSessionEditor';
import { RemainingWorkSection } from '@/features/study-plan/ui/RemainingWorkSection';
import { WorkloadWarnings } from '@/features/study-plan/ui/WorkloadWarnings';

type Mode = 'initial' | 'generating' | 'preview' | 'saved';

function flattenPreview(p: PlanPreview): ProposedSession[] {
  const out: ProposedSession[] = [];
  for (const day of p.days) {
    for (const s of day.sessions) {
      out.push({
        assignmentId: s.assignmentId,
        assignmentTitle: s.assignmentTitle,
        date: day.date,
        startTime: s.startTime,
        endTime: s.endTime,
        durationMinutes: s.durationMinutes,
      });
    }
  }
  return out;
}

function projectSessions(sessions: ProposedSession[]): ProposedSessionInput[] {
  return sessions.map((s) => ({
    assignmentId: s.assignmentId,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
  }));
}

function hasSessions(plan: SavedPlan | null): boolean {
  return !!plan && plan.days.some((d) => d.sessions.length > 0);
}

export function PlanPage() {
  const [mode, setMode] = useState<Mode>('initial');
  const [savedPlan, setSavedPlan] = useState<SavedPlan | null>(null);
  const [preview, setPreview] = useState<PlanPreview | null>(null);
  const [edited, setEdited] = useState<ProposedSession[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<PlanConflict[]>([]);
  const [rolledOver, setRolledOver] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);

  const loadSaved = useCallback(async () => {
    setIsLoadingSaved(true);
    setLoadError(null);
    try {
      const plan = await listStudyPlan();
      setSavedPlan(plan);
      setMode(hasSessions(plan) ? 'saved' : 'initial');
    } catch (err) {
      setLoadError(getErrorMessage(err) || 'We could not load your saved plan. Try again.');
    } finally {
      setIsLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setPreviewError(null);
    setConflicts([]);
    setRolledOver(false);
    try {
      const p = await previewStudyPlan();
      setPreview(p);
      setEdited(flattenPreview(p));
      setMode('preview');
    } catch (err) {
      setPreviewError(getErrorMessage(err) || 'We could not generate a plan. Try again.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!preview) return;
    setIsSaving(true);
    setConflicts([]);
    setRolledOver(false);
    try {
      const saved = await saveStudyPlan(preview.from, preview.to, projectSessions(edited));
      setSavedPlan(saved);
      setPreview(null);
      setEdited([]);
      setMode('saved');
      toast.success('Plan saved.');
    } catch (err) {
      const data = (err as { response?: { data?: { error?: string; conflicts?: PlanConflict[] } } })
        ?.response?.data;
      if (data?.error === 'WINDOW_ROLLED_OVER') {
        setRolledOver(true);
        setPreview(null);
        setEdited([]);
        setMode('initial');
        return;
      }
      if (data?.conflicts && data.conflicts.length > 0) {
        setConflicts(data.conflicts);
        const summary = data.conflicts
          .map((c) => `${c.date} ${c.startTime} — ${CONFLICT_REASON_LABEL[c.reason] ?? c.reason}`)
          .join('; ');
        toast.error(`Save rejected: ${summary}`);
        return;
      }
      toast.error(getErrorMessage(err) || 'We could not save your plan. Try again.');
    } finally {
      setIsSaving(false);
    }
  }, [preview, edited]);

  const windowDays = useMemo(() => {
    if (preview) return preview.days.map((d) => d.date);
    if (savedPlan) return savedPlan.days.map((d) => d.date);
    return [];
  }, [preview, savedPlan]);

  const timeZone = preview?.timeZone ?? savedPlan?.timeZone;

  if (isLoadingSaved) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-text mb-2">Plan</h1>
        <div className="card p-4 sm:p-6">
          <div className="grid grid-cols-7 gap-2 overflow-x-auto">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="min-w-[140px] space-y-2 rounded-lg border border-border p-2">
                {Array.from({ length: 3 }).map((__, j) => (
                  <div key={j} className="h-12 animate-pulse rounded-lg bg-surface-muted" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-text mb-2">Plan</h1>
        <div role="alert" className="card border border-danger/30 bg-danger/10 p-6">
          <p className="text-sm text-danger">{loadError}</p>
          <Button className="mt-4" onClick={() => void loadSaved()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="plan-heading"
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
    >
      <div className="mb-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 id="plan-heading" className="text-3xl font-bold text-text">
            Plan
          </h1>
          <p className="text-sm text-text-muted">Your study plan for the week.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => void handleGenerate()}
            disabled={isGenerating}
            isLoading={isGenerating}
            aria-label="Generate plan"
          >
            Generate plan
          </Button>
          {mode === 'preview' && (
            <Button
              onClick={() => void handleSave()}
              disabled={isSaving}
              isLoading={isSaving}
              aria-label="Save plan"
            >
              Save plan
            </Button>
          )}
        </div>
      </div>

      <RemainingWorkSection timeZone={timeZone} className="mb-6" />

      {rolledOver && (
        <div role="alert" className="mb-4 card border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm text-text">
            The plan week has rolled over — generate a new proposal to save it.
          </p>
          <Button className="mt-2" onClick={() => void handleGenerate()}>
            Generate plan
          </Button>
        </div>
      )}

      {previewError && (
        <div role="alert" className="mb-4 card border border-danger/30 bg-danger/10 p-6">
          <p className="text-sm text-danger">{previewError}</p>
          <Button className="mt-4" onClick={() => void handleGenerate()}>
            Try again
          </Button>
        </div>
      )}

      {mode === 'initial' && !rolledOver && (
        <div className="card p-6 text-center" data-testid="plan-initial">
          <p className="text-sm text-text">No plan yet.</p>
          <p className="mt-1 text-sm text-text-muted">
            Generate a plan to see proposed study sessions for the week.
          </p>
        </div>
      )}

      {mode === 'preview' && preview && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-text">
              {preview.from} – {preview.to} · {preview.timeZone}
            </p>
          </div>
          {preview.days.every((d) => d.sessions.length === 0) && (
            <div className="mb-4 card p-4 text-center" data-testid="plan-empty">
              <p className="text-sm text-text">No sessions proposed — Generate a plan</p>
            </div>
          )}
          <PlanSessionEditor sessions={edited} days={windowDays} onChange={setEdited} />
          {conflicts.length > 0 && (
            <div
              role="alert"
              className="mt-4 card border border-danger/30 bg-danger/10 p-4"
              data-testid="conflict-summary"
            >
              <p className="text-sm font-medium text-danger">Conflicts:</p>
              <ul className="mt-2 space-y-1 text-sm text-danger">
                {conflicts.map((c, i) => (
                  <li key={i}>
                    {c.date} {c.startTime} — {CONFLICT_REASON_LABEL[c.reason] ?? c.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {mode === 'saved' && savedPlan && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-text">
              {savedPlan.from} – {savedPlan.to} · {savedPlan.timeZone}
            </p>
          </div>
          <PlanWeek
            days={savedPlan.days.map((d) => ({
              date: d.date,
              sessions: d.sessions.map((s) => ({
                assignmentTitle: s.assignmentTitle,
                startTime: s.startTime,
                endTime: s.endTime,
                durationMinutes: s.durationMinutes,
              })),
            }))}
            timeZone={savedPlan.timeZone}
          />
          {savedPlan.days.every((d) => d.sessions.length === 0) && (
            <p className="mt-2 text-sm text-text-muted">No saved plan yet.</p>
          )}
        </>
      )}

      {isGenerating && (
        <div className="card p-4 sm:p-6">
          <div className="grid grid-cols-7 gap-2 overflow-x-auto">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="min-w-[140px] space-y-2 rounded-lg border border-border p-2">
                {Array.from({ length: 3 }).map((__, j) => (
                  <div key={j} className="h-12 animate-pulse rounded-lg bg-surface-muted" />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <WorkloadWarnings
        className="mt-6"
        warnings={preview?.warnings}
        deferred={preview?.deferred}
        errorMessage={previewError ?? undefined}
      />
    </section>
  );
}

export default PlanPage;

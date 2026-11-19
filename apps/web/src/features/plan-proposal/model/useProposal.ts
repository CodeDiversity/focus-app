import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/shared/lib/errors';
import { confirmCatchUpPlan, previewCatchUp } from '@/entities/study-plan/api/studyPlanApi';
import type {
  CatchUpPreview,
  PlanConflict,
  PlanPacing,
  ProposedSession,
} from '@/entities/study-plan/model/types';
import { flattenPreview, projectSessions } from '@/features/study-plan/lib/preview';

export type ProposalPhase = 'loading' | 'ready' | 'error';

/**
 * EP16C (D16-4, D-C9) — the one planning flow's state, lifted from EP08E's
 * `CatchUpPreview`. Every proposal is `previewCatchUp` → edit →
 * `confirmCatchUpPlan`: the same engine the plain preview ran, plus the
 * moved-forward context and the locked/completed preservation the proposal
 * shows (contracts § One planning flow).
 *
 * The preview is a client-held proposal; declining makes no request. A
 * confirm that resolves after the student left still toasts "Plan saved."
 * but never navigates (D-C9).
 *
 * EP17G (D-G9) adds `replan()` — the non-destructive rebuild a plan-time
 * preset change runs. See below.
 */
export interface UseProposalOptions {
  /** Called once a confirm succeeds while the surface is still mounted. */
  onConfirmed: () => void;
}

/**
 * EP17G (D-G9) — what a non-destructive rebuild tells its caller. `ok: false`
 * means the rebuild failed *and nothing was thrown away*; the error message is
 * owned by the control that asked for it (`PacingControls`), so there is one
 * home for it.
 */
export interface ReplanResult {
  ok: boolean;
  pacing?: PlanPacing;
}

export function useProposal({ onConfirmed }: UseProposalOptions) {
  const [preview, setPreview] = useState<CatchUpPreview | null>(null);
  const [edited, setEdited] = useState<ProposedSession[]>([]);
  const [phase, setPhase] = useState<ProposalPhase>('loading');
  const [isConfirming, setIsConfirming] = useState(false);
  const [conflicts, setConflicts] = useState<PlanConflict[]>([]);
  const [rolledOver, setRolledOver] = useState(false);
  // EP17G (D-G9): in flight for a plan-time rebuild, distinct from `phase`.
  const [isReplanning, setIsReplanning] = useState(false);

  const mounted = useRef(true);
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setPhase('loading');
    setConflicts([]);
    setRolledOver(false);
    try {
      const p = await previewCatchUp();
      if (!mounted.current) return;
      setPreview(p);
      setEdited(flattenPreview(p));
      setPhase('ready');
    } catch {
      if (!mounted.current) return;
      setPreview(null);
      setEdited([]);
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * EP17G (D-G9) — the **non-destructive** sibling of `load()`. A plan-time
   * preset change rebuilds the week with it, so a failure must leave the
   * student's current proposal on screen and editable (EP17G-AC3):
   * `preview`, `edited` and `phase` are untouched on the error path, and the
   * caller is told by the returned `ok: false`. `load()` keeps its own
   * destructive behaviour (and its tests) for the mount path, **Try again**
   * and **Create new plan**.
   */
  const replan = useCallback(async (): Promise<ReplanResult> => {
    setIsReplanning(true);
    setConflicts([]);
    try {
      const p = await previewCatchUp();
      if (!mounted.current) return { ok: false };
      setPreview(p);
      setEdited(flattenPreview(p));
      setRolledOver(false);
      setPhase('ready');
      return { ok: true, pacing: p.pacing };
    } catch {
      // Deliberately nothing: the previous proposal stays rendered.
      return { ok: false };
    } finally {
      if (mounted.current) setIsReplanning(false);
    }
  }, []);

  const confirm = useCallback(async () => {
    if (!preview) return;
    setIsConfirming(true);
    setConflicts([]);
    try {
      await confirmCatchUpPlan(preview.from, preview.to, projectSessions(edited));
      toast.success('Plan saved.');
      if (mounted.current) onConfirmedRef.current();
    } catch (err) {
      if (!mounted.current) return;
      const data = (err as { response?: { data?: { error?: string; conflicts?: PlanConflict[] } } })
        ?.response?.data;
      if (data?.error === 'WINDOW_ROLLED_OVER') {
        // The window is gone; edits are discarded with it.
        setRolledOver(true);
        setPreview(null);
        setEdited([]);
        return;
      }
      if (data?.conflicts && data.conflicts.length > 0) {
        // D-C11: the inline conflict summary is the one message — no toast
        // doubling it. Edits are preserved; the offending rows are marked.
        setConflicts(data.conflicts);
        return;
      }
      toast.error(getErrorMessage(err) || "We couldn't save this plan. Try again.");
    } finally {
      if (mounted.current) setIsConfirming(false);
    }
  }, [preview, edited]);

  /** A persisted lock flip syncs the kept-sessions list and its count (±1, never below 0). */
  const onLockedChange = useCallback((sessionId: string, nextLocked: boolean) => {
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

  return {
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
  };
}

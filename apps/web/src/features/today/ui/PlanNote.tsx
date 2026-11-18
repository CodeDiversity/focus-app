import { Link } from 'react-router-dom';
import type { RecoverySummary } from '@/entities/study-plan/model/types';
import type { DashboardSectionStatus } from './dashboardSection';

/**
 * EP16B-AC1 (D16-18, D-B1, D-B7) — Today's plan note: one neutral sentence
 * when the plan moved unfinished work forward (EP13C), with the week one
 * click away. No number, no card; nothing while loading or on error — an
 * absent note costs the student nothing, and an error line about plan
 * changes would lead with a failure (contracts § Copy rules).
 */
export interface PlanNoteProps {
  summary?: RecoverySummary;
  status: DashboardSectionStatus;
}

export function PlanNote({ summary, status }: PlanNoteProps) {
  if (status !== 'ready' || !summary || summary.rolledForwardCount <= 0) return null;
  return (
    <p className="mb-6 text-sm text-text-muted" data-testid="plan-note">
      Some earlier sessions moved into your current plan — today&apos;s list is up to date.{' '}
      <Link
        to="/plan"
        className="font-medium text-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
      >
        See your week
      </Link>
    </p>
  );
}

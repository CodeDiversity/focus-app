import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

/**
 * EP05C — the dashboard's **one** quick action (Decisions #1–#5, #11).
 *
 * The placeholder's three inert buttons are gone: "Create Study Plan" (EP06)
 * and "Start Focus Session" (EP07) are **omitted**, not shipped disabled
 * (D05-5, which resolves EP07's D07-9 seam), and "Add New Assignment" is
 * renamed to the EP03 host copy "Add assignment" (Decision #2).
 *
 * The control is a **pure trigger** (Decision #5):
 *
 * - it is never `disabled` and never `isLoading`, so it carries no
 *   `aria-busy` and renders no spinner — the request's busy state belongs to
 *   the shared form's submit button;
 * - it is never disabled while the dialog is open, because the shared form
 *   restores focus to the control that opened it
 *   (`AssignmentForm.tsx:149-155`) — a disabled activator would lose the
 *   focus restoration and the post-create focus target.
 *
 * It carries `data-assignment-focus="add"` — the shared hook's stable
 * post-create focus target, resolved page-globally through the host's
 * `sectionRef` (`useAssignmentActions.ts:86-88`, `:230-238`). It is the
 * page's **only** control with that attribute: the empty states carry none,
 * so the hook's post-delete fallback lands here too (Decision #11).
 */
export interface DashboardQuickActionsProps {
  /** Opens the shared create form through the shared assignment owner. */
  onAddAssignment: () => void;
}

/**
 * The quick-action control. It renders **one** button — the page's single
 * primary action — and is placed by the host in the header's action group,
 * as the group's first control (before "View Profile", Decision #1).
 */
export function DashboardQuickActions({ onAddAssignment }: DashboardQuickActionsProps) {
  return (
    <Button
      type="button"
      variant="primary"
      data-assignment-focus="add"
      className="max-sm:min-h-[44px]"
      onClick={onAddAssignment}
      leftIcon={<Plus aria-hidden size={16} />}
    >
      Add assignment
    </Button>
  );
}

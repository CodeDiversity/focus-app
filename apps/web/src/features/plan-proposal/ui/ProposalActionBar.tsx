import { Button } from '@/shared/ui/Button';

export interface ProposalActionBarProps {
  /** The confirm renders only when a preview exists (loading/error: decline only). */
  showConfirm: boolean;
  isConfirming: boolean;
  /** EP17G-AC3: disabled without a spinner while the week is being rebuilt. */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}

/**
 * EP17F (▲ D-F1 (a), AC-E17-11) — the one decision bar: exactly one
 * **Use this plan** and one **Not now**, fixed to the viewport bottom so the
 * decision is reachable from wherever the student stopped editing.
 *
 * D-F5: below `md` the bar sits **above** EP16E's tab bar — the offset is the
 * bar's own `min-h-14` (3.5 rem) plus the safe-area inset it pads with
 * (`TabBar.tsx`), expressed in CSS against the same `md` boundary
 * `useTabBarVisible` uses (importing the hook would break the FSD zones,
 * `apps/web/.eslintrc.cjs` features → widgets). `z-20` stays under the tab
 * bar's `z-30`, so navigation wins if a future shell change moves the offset.
 * The proposal section reserves matching bottom padding (`pb-24`).
 */
export function ProposalActionBar({
  showConfirm,
  isConfirming,
  confirmDisabled = false,
  onConfirm,
  onDecline,
}: ProposalActionBarProps) {
  return (
    <div
      data-testid="proposal-action-bar"
      className="fixed inset-x-0 z-20 border-t border-border bg-surface bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0 pb-[env(safe-area-inset-bottom)] md:pb-0"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-3">
        <Button
          variant="ghost"
          onClick={onDecline}
          className="flex-1 sm:flex-initial max-sm:min-h-[44px]"
        >
          Not now
        </Button>
        {showConfirm ? (
          <Button
            onClick={onConfirm}
            disabled={isConfirming || confirmDisabled}
            isLoading={isConfirming}
            className="flex-1 sm:flex-initial max-sm:min-h-[44px]"
          >
            Use this plan
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default ProposalActionBar;

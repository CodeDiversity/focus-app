import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProposalActionBar } from './ProposalActionBar';

function renderBar(props: Partial<Parameters<typeof ProposalActionBar>[0]> = {}) {
  const handlers = { onConfirm: vi.fn(), onDecline: vi.fn() };
  render(<ProposalActionBar showConfirm={true} isConfirming={false} {...handlers} {...props} />);
  return handlers;
}

describe('ProposalActionBar (EP17F, ▲ D-F1, AC-E17-11)', () => {
  it('renders one Use this plan and one Not now and wires both', async () => {
    const user = userEvent.setup();
    const h = renderBar();
    expect(screen.getAllByRole('button', { name: /use this plan/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /not now/i })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /use this plan/i }));
    expect(h.onConfirm).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: /not now/i }));
    expect(h.onDecline).toHaveBeenCalledTimes(1);
  });

  it('hides the confirm while there is no preview (loading / error / rolled over)', () => {
    renderBar({ showConfirm: false });
    expect(screen.queryByRole('button', { name: /use this plan/i })).toBeNull();
    expect(screen.getByRole('button', { name: /not now/i })).toBeInTheDocument();
  });

  it('while confirming the confirm is busy and Not now stays enabled', () => {
    renderBar({ isConfirming: true });
    const confirm = screen.getByRole('button', { name: /use this plan/i });
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: /not now/i })).toBeEnabled();
  });

  it('carries the D-F5 offset contract: above the tab bar below md, bottom-0 at md, under the bar in z-order', () => {
    renderBar();
    const bar = screen.getByTestId('proposal-action-bar');
    expect(bar.className).toContain('fixed');
    expect(bar.className).toContain('bottom-[calc(3.5rem+env(safe-area-inset-bottom))]');
    expect(bar.className).toContain('md:bottom-0');
    expect(bar.className).toContain('pb-[env(safe-area-inset-bottom)]');
    expect(bar.className).toContain('md:pb-0');
    expect(bar.className).toContain('z-20'); // the tab bar keeps z-30
  });

  it('keeps 44px targets below sm (class contract)', () => {
    renderBar();
    for (const name of [/use this plan/i, /not now/i]) {
      expect(screen.getByRole('button', { name }).className).toContain('max-sm:min-h-[44px]');
    }
  });
});

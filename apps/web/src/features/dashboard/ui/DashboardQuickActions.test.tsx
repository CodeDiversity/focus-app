import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Providers } from '@/test/providers';
import { DashboardQuickActions } from './DashboardQuickActions';

/**
 * EP05C — the quick action's presentation contract (Decisions #1–#5, #11,
 * #17, #18; TR-E05-05, TR-E05-07).
 */
const renderQuickActions = () => {
  const onAddAssignment = vi.fn();
  const view = render(
    <Providers initialEntries={['/dashboard']}>
      <DashboardQuickActions onAddAssignment={onAddAssignment} />
    </Providers>
  );
  return { ...view, onAddAssignment };
};

describe('DashboardQuickActions (EP05C)', () => {
  it('renders exactly one action, labelled "Add assignment", with the Plus icon', () => {
    const { container } = renderQuickActions();

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    const trigger = screen.getByRole('button', { name: 'Add assignment' });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Add assignment');
    // The `Plus` icon is decorative — the accessible name stays exact.
    expect(container.querySelector('svg.lucide-plus')).not.toBeNull();
    // The primary variant.
    expect(trigger.className).toContain('bg-accent');
  });

  it("does not render the placeholder's other quick actions", () => {
    renderQuickActions();

    expect(screen.queryByRole('button', { name: 'Create Study Plan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start Focus Session' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add New Assignment' })).not.toBeInTheDocument();
  });

  it("carries the shared hook's stable post-create focus target", () => {
    renderQuickActions();

    expect(screen.getByRole('button', { name: 'Add assignment' })).toHaveAttribute(
      'data-assignment-focus',
      'add'
    );
  });

  it('calls the open handler once on a mouse activation', async () => {
    const { onAddAssignment } = renderQuickActions();

    await userEvent.click(screen.getByRole('button', { name: 'Add assignment' }));

    expect(onAddAssignment).toHaveBeenCalledTimes(1);
  });

  it('calls the open handler once on Enter and once on Space', async () => {
    const { onAddAssignment } = renderQuickActions();
    const trigger = screen.getByRole('button', { name: 'Add assignment' });

    trigger.focus();
    expect(trigger).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onAddAssignment).toHaveBeenCalledTimes(1);

    await userEvent.keyboard(' ');
    expect(onAddAssignment).toHaveBeenCalledTimes(2);
  });

  it('is never disabled and shows no busy state', () => {
    renderQuickActions();

    const trigger = screen.getByRole('button', { name: 'Add assignment' });
    expect(trigger).toBeEnabled();
    expect(trigger).not.toHaveAttribute('aria-busy');
    expect(trigger).not.toHaveAttribute('disabled');
    // The shared Button renders a spinner only while `isLoading` — the pure
    // trigger renders none.
    expect(trigger.querySelector('svg.animate-spin')).toBeNull();
  });

  it('exposes the EP10 focus treatment and the 44 px tap target', () => {
    renderQuickActions();

    const trigger = screen.getByRole('button', { name: 'Add assignment' });
    expect(trigger.className).toContain('focus-visible:ring-2');
    expect(trigger.className).toContain('focus-visible:ring-focus-ring');
    expect(trigger.className).toContain('focus-visible:ring-offset-2');
    expect(trigger.className).toContain('max-sm:min-h-[44px]');
  });

  it('introduces no animation without its reduced-motion companion', () => {
    const { container } = renderQuickActions();

    const animated = Array.from(container.querySelectorAll('*')).filter((element) =>
      Array.from(element.classList).some((name) => name.startsWith('animate-'))
    );
    animated.forEach((element) => {
      expect(element.classList.contains('motion-reduce:animate-none')).toBe(true);
    });
  });
});

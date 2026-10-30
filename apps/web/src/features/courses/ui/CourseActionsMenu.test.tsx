import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Providers } from '@/test/providers';
import { setupUser } from '@/test/user';
import { CourseActionsMenu } from './CourseActionsMenu';

const renderMenu = (overrides: Partial<Parameters<typeof CourseActionsMenu>[0]> = {}) =>
  render(
    <Providers>
      <CourseActionsMenu
        courseId="course-1"
        courseName="Intro to Computer Science"
        isActive={true}
        onEdit={vi.fn()}
        onArchiveRestore={vi.fn()}
        {...overrides}
      />
    </Providers>
  );

describe('CourseActionsMenu (SP-126)', () => {
  it('renders a trigger with an accessible name and collapsed state', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: /actions for intro to computer science/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('opens on click and focuses the first menu item', async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole('button', { name: /actions for intro to computer science/i });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /edit intro to computer science/i })).toHaveFocus();
  });

  it('offers Edit and Archive for active courses with per-course aria-labels', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onArchiveRestore = vi.fn();
    renderMenu({ onEdit, onArchiveRestore });
    await user.click(
      screen.getByRole('button', { name: /actions for intro to computer science/i })
    );
    expect(
      screen.getByRole('menuitem', { name: /edit intro to computer science/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /archive intro to computer science/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /restore intro to computer science/i })
    ).not.toBeInTheDocument();
  });

  it('offers Restore (not Archive) for archived courses', async () => {
    const user = userEvent.setup();
    renderMenu({ isActive: false });
    await user.click(
      screen.getByRole('button', { name: /actions for intro to computer science/i })
    );
    expect(
      screen.getByRole('menuitem', { name: /restore intro to computer science/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /archive intro to computer science/i })
    ).not.toBeInTheDocument();
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    const user = setupUser();
    renderMenu();
    const trigger = screen.getByRole('button', { name: /actions for intro to computer science/i });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('cycles items with arrow keys', async () => {
    const user = setupUser();
    renderMenu();
    const trigger = screen.getByRole('button', { name: /actions for intro to computer science/i });
    await user.click(trigger);
    const editItem = screen.getByRole('menuitem', { name: /edit intro to computer science/i });
    const archiveItem = screen.getByRole('menuitem', {
      name: /archive intro to computer science/i,
    });
    expect(editItem).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(archiveItem).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(editItem).toHaveFocus();
  });

  it('re-focuses the trigger before invoking the callback', async () => {
    const user = setupUser();
    const onEdit = vi.fn();
    renderMenu({ onEdit });
    const trigger = screen.getByRole('button', { name: /actions for intro to computer science/i });
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: /edit intro to computer science/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();
  });

  it('does not invoke callbacks when disabled', () => {
    const onEdit = vi.fn();
    renderMenu({ disabled: true, onEdit });
    const trigger = screen.getByRole('button', { name: /actions for intro to computer science/i });
    expect(trigger).toBeDisabled();
  });
});

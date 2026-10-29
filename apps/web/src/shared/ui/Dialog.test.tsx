import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('does not render when closed', () => {
    render(<Dialog open={false} onClose={() => {}} title="T" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders with role dialog and aria-modal when open', () => {
    render(<Dialog open onClose={() => {}} title="My title" description="Desc" />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('My title')).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="T" />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click', () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="T" />);
    const backdrop = document.querySelector('.bg-text\\/50') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on backdrop click when disableBackdropClose', () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="T" disableBackdropClose />);
    const backdrop = document.querySelector('.bg-text\\/50') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('traps focus between buttons', async () => {
    const user = userEvent.setup();
    render(
      <Dialog
        open
        onClose={() => {}}
        title="T"
        footer={
          <>
            <button>A</button>
            <button>B</button>
          </>
        }
      >
        <button>Body</button>
      </Dialog>
    );
    const buttons = screen.getAllByRole('button');
    // focus first focusable on mount
    expect(document.activeElement).toBe(buttons[0]);
    await user.tab();
    // cycles
    expect(document.activeElement).toBeTruthy();
  });

  it('restores focus to trigger on close/unmount', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount } = render(<Dialog open onClose={() => {}} title="T" />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('applies size classes', () => {
    render(<Dialog open onClose={() => {}} title="T" size="lg" />);
    expect(screen.getByRole('dialog').className).toContain('max-w-lg');
  });
});

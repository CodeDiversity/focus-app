import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProposedSession } from '@/entities/study-plan/model/types';
import { EditableSessionCard, SessionEditorPanel, panelIdFor } from './EditableSessionCard';

const fixed: ProposedSession = {
  assignmentId: 'a-1',
  assignmentTitle: 'Essay',
  date: '2026-10-30',
  startTime: '09:00',
  endTime: '10:00',
  durationMinutes: 60,
  anchor: 'FIXED',
  windowHint: null,
};

const flex: ProposedSession = {
  ...fixed,
  startTime: '19:00',
  endTime: '20:00',
  anchor: 'FLEX_DAY',
  windowHint: 'EVENING',
};

const days = ['2026-10-30', '2026-10-31'];

function renderPanel(session: ProposedSession) {
  const handlers = {
    onUpdate: vi.fn(),
    onChangeDay: vi.fn(),
    onMove: vi.fn(),
    onResize: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
    announce: vi.fn(),
  };
  render(<SessionEditorPanel session={session} index={0} days={days} {...handlers} />);
  return handlers;
}

describe('EditableSessionCard (EP17E, AC-E17-09)', () => {
  it('the first element is a disclosure button named by title and time label, with aria-expanded/aria-controls', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <EditableSessionCard
        session={fixed}
        index={3}
        open={false}
        conflicts={[]}
        onToggle={onToggle}
        buttonRef={() => {}}
      />
    );
    const button = screen.getByRole('button', { name: /essay 09:00 – 10:00 · 60 min/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    expect(onToggle).toHaveBeenCalledWith(3);

    rerender(
      <EditableSessionCard
        session={fixed}
        index={3}
        open={true}
        conflicts={[]}
        onToggle={onToggle}
        buttonRef={() => {}}
      />
    );
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', panelIdFor(3));
    // Selected state is ring AND text, never colour alone.
    expect(screen.getByText('Editing')).toBeInTheDocument();
  });

  it('a flex card reads Anytime with its hint; a fixed card keeps its clock range (D-H1)', () => {
    render(
      <>
        <EditableSessionCard
          session={flex}
          index={0}
          open={false}
          conflicts={[]}
          onToggle={() => {}}
          buttonRef={() => {}}
        />
        <EditableSessionCard
          session={fixed}
          index={1}
          open={false}
          conflicts={[]}
          onToggle={() => {}}
          buttonRef={() => {}}
        />
      </>
    );
    expect(screen.getByText('Anytime · 60 min · evening suggested')).toBeInTheDocument();
    expect(screen.getByText('09:00 – 10:00 · 60 min')).toBeInTheDocument();
  });

  it('a conflicted card is marked by border, data attribute and text (keyboard-visible reason)', () => {
    const { container } = render(
      <EditableSessionCard
        session={fixed}
        index={0}
        open={false}
        conflicts={[
          { sessionIndex: 0, date: '2026-10-30', startTime: '09:00', reason: 'OVERLAPS_CLASS' },
        ]}
        onToggle={() => {}}
        buttonRef={() => {}}
      />
    );
    const card = container.querySelector('article');
    expect(card?.getAttribute('data-conflicted')).toBe('true');
    expect(card?.className).toContain('border-danger');
    expect(card).toHaveTextContent('This overlaps a class');
  });

  it('the panel explains the categories once and renders human day options (D-H3, D-E5)', () => {
    renderPanel(fixed);
    expect(screen.getByText(/Fixed-time sessions keep their slot/)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Fri, Oct 30' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sat, Oct 31' })).toBeInTheDocument();
  });

  it('move / resize / delete reach their handlers by pointer and by keyboard', async () => {
    const user = userEvent.setup();
    const h = renderPanel(fixed);
    await user.click(screen.getByRole('button', { name: 'Move earlier 15 minutes' }));
    expect(h.onMove).toHaveBeenCalledWith(0, -15);
    screen.getByRole('button', { name: 'Lengthen 15 minutes' }).focus();
    await user.keyboard('{Enter}');
    expect(h.onResize).toHaveBeenCalledWith(0, 15);
    screen.getByRole('button', { name: 'Delete session' }).focus();
    await user.keyboard('{Enter}');
    expect(h.onDelete).toHaveBeenCalledWith(0);
  });

  it('"Pin to this time" fixes a flex session and clears its hint (D-H4); announced once', async () => {
    const user = userEvent.setup();
    const h = renderPanel(flex);
    await user.click(screen.getByRole('button', { name: /pin to this time: essay, 19:00/i }));
    expect(h.onUpdate).toHaveBeenCalledWith(0, { anchor: 'FIXED', windowHint: null });
    expect(h.announce).toHaveBeenCalledWith('Essay pinned to 19:00');
  });

  it('"Make flexible" derives the hint from the current start (D-H6)', async () => {
    const user = userEvent.setup();
    const h = renderPanel(fixed);
    await user.click(screen.getByRole('button', { name: /make flexible: essay/i }));
    expect(h.onUpdate).toHaveBeenCalledWith(0, { anchor: 'FLEX_DAY', windowHint: 'MORNING' });
  });

  it('Escape inside the panel calls onClose (EP17E-AC2)', async () => {
    const user = userEvent.setup();
    const h = renderPanel(fixed);
    screen.getByRole('button', { name: 'Move later 15 minutes' }).focus();
    await user.keyboard('{Escape}');
    expect(h.onClose).toHaveBeenCalled();
  });

  it('changing the day defers to onChangeDay (the week announces and refocuses)', async () => {
    const user = userEvent.setup();
    const h = renderPanel(fixed);
    await user.selectOptions(screen.getByLabelText('Day'), '2026-10-31');
    expect(h.onChangeDay).toHaveBeenCalledWith(0, '2026-10-31');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanSessionEditor } from './PlanSessionEditor';
import type { ProposedSession } from '@/entities/study-plan/model/types';

const sessions: ProposedSession[] = [
  {
    assignmentId: 'a-1',
    assignmentTitle: 'Essay',
    date: '2026-10-30',
    startTime: '09:00',
    endTime: '10:00',
    durationMinutes: 60,
    // EP13H: the editor carries the EP13G anchor; the pre-existing cases
    // exercise a fixed row (the EP06 behaviour).
    anchor: 'FIXED',
    windowHint: null,
  },
];

const flexSession: ProposedSession = {
  ...{
    assignmentId: 'a-1',
    assignmentTitle: 'Essay',
    date: '2026-10-30',
    startTime: '19:00',
    endTime: '20:00',
    durationMinutes: 60,
  },
  anchor: 'FLEX_DAY',
  windowHint: 'EVENING',
};

const days = ['2026-10-30', '2026-10-31'];

describe('PlanSessionEditor', () => {
  it('deleting a session removes it', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PlanSessionEditor sessions={sessions} days={days} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /delete session/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('moving earlier updates the session', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PlanSessionEditor sessions={sessions} days={days} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /move earlier/i }));
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0];
    expect(next[0].startTime).toBe('08:45');
  });

  it('resizing longer updates the length', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PlanSessionEditor sessions={sessions} days={days} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /lengthen/i }));
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0];
    expect(next[0].durationMinutes).toBe(75);
  });

  it('is keyboard operable (buttons are focusable)', () => {
    render(<PlanSessionEditor sessions={sessions} days={days} onChange={() => {}} />);
    const btn = screen.getByRole('button', { name: /delete session/i });
    btn.focus();
    expect(document.activeElement).toBe(btn);
  });

  it('does not move outside limits', async () => {
    const s: ProposedSession[] = [
      { ...sessions[0], startTime: '00:00', endTime: '01:00', durationMinutes: 60 },
    ];
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PlanSessionEditor sessions={s} days={days} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /move earlier/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  // ============ additive EP08E cases: the optional `conflicts` prop ============

  it('marks the row whose sessionIndex matches with border-danger and the textual reason', () => {
    const twoRows: ProposedSession[] = [
      sessions[0],
      { ...sessions[0], assignmentId: 'a-2', assignmentTitle: 'Reading', startTime: '14:00' },
    ];
    const { container } = render(
      <PlanSessionEditor
        sessions={twoRows}
        days={days}
        onChange={() => {}}
        conflicts={[
          {
            sessionIndex: 1,
            date: '2026-10-30',
            startTime: '14:00',
            reason: 'OVERLAPS_CLASS',
          },
        ]}
      />
    );
    const rows = container.querySelectorAll('article');
    expect(rows).toHaveLength(2);
    // Only the matching row is marked — border-danger pairs with the textual
    // reason (never color alone).
    expect(rows[1].className).toContain('border-danger');
    expect(rows[0].className).not.toContain('border-danger');
    expect(rows[1]).toHaveTextContent(/overlaps a class/i);
    expect(rows[1].getAttribute('data-conflicted')).toBe('true');
    expect(rows[0].getAttribute('data-conflicted')).toBeNull();
  });

  it('markup is unchanged when the conflicts prop is absent', () => {
    const { container } = render(
      <PlanSessionEditor sessions={sessions} days={days} onChange={() => {}} />
    );
    const row = container.querySelector('article');
    expect(row?.className).toBe('mb-3 rounded-md border border-border bg-surface p-3');
    expect(row?.getAttribute('data-conflicted')).toBeNull();
  });

  // ===================== EP13H — flex sessions in the editor =====================

  it('a flex row reads Anytime with its hint; a fixed row keeps its clock range (D-H1)', () => {
    render(
      <PlanSessionEditor sessions={[flexSession, sessions[0]]} days={days} onChange={() => {}} />
    );
    expect(screen.getByText('Anytime · 60 min · evening suggested')).toBeInTheDocument();
    expect(screen.getByText('09:00 – 10:00 · 60 min')).toBeInTheDocument();
    // The editor explains the categories once, in plain language (D-H3).
    expect(screen.getByText(/Fixed-time sessions keep their slot/)).toBeInTheDocument();
  });

  it('"Pin to this time" fixes a flex row and clears its hint (D-H4)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PlanSessionEditor sessions={[flexSession]} days={days} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /pin essay to 19:00/i }));
    const next = onChange.mock.calls[0][0];
    expect(next[0].anchor).toBe('FIXED');
    expect(next[0].windowHint).toBeNull();
  });

  it('"Make flexible" unpins and derives the hint from the suggested start (D-H6)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PlanSessionEditor sessions={sessions} days={days} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /make essay flexible/i }));
    const next = onChange.mock.calls[0][0];
    expect(next[0].anchor).toBe('FLEX_DAY');
    // 09:00 start → morning.
    expect(next[0].windowHint).toBe('MORNING');
  });

  it('moving a flex row pins it — choosing a time is the commitment (D-H5)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PlanSessionEditor sessions={[flexSession]} days={days} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /move later/i }));
    const next = onChange.mock.calls[0][0];
    expect(next[0].anchor).toBe('FIXED');
    expect(next[0].windowHint).toBeNull();
    expect(next[0].startTime).toBe('19:15');
  });

  it('changing only the duration keeps a flex row flexible (D-H5)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PlanSessionEditor sessions={[flexSession]} days={days} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /lengthen/i }));
    const next = onChange.mock.calls[0][0];
    expect(next[0].anchor).toBe('FLEX_DAY');
    expect(next[0].windowHint).toBe('EVENING');
    expect(next[0].durationMinutes).toBe(75);
  });

  it('changing the day keeps a flex row flexible — a day is what it anchors to (D-H5)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PlanSessionEditor sessions={[flexSession]} days={days} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText('Day'), '2026-10-31');
    const next = onChange.mock.calls[0][0];
    expect(next[0].date).toBe('2026-10-31');
    expect(next[0].anchor).toBe('FLEX_DAY');
  });
});

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
  },
];

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
});

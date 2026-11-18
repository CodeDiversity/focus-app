import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MovedForwardList } from './MovedForwardList';
import type { MissedSession } from '@/entities/study-plan/model/types';

const sessions: MissedSession[] = [
  {
    id: 'ps-1',
    assignmentId: 'a-1',
    assignmentTitle: 'Essay',
    date: '2026-10-29',
    startTime: '09:00',
    endTime: '10:00',
    durationMinutes: 60,
    locked: true,
  },
];

describe('MovedForwardList', () => {
  it('renders moved-forward sessions with the locked badge', () => {
    render(<MovedForwardList sessions={sessions} />);
    expect(
      screen.getByRole('heading', { name: 'Moved forward into this plan' })
    ).toBeInTheDocument();
    expect(screen.getByText('Essay')).toBeInTheDocument();
    expect(screen.getByText('2026-10-29')).toBeInTheDocument();
    expect(screen.getByText('09:00 – 10:00')).toBeInTheDocument();
    expect(screen.getByText('1 h 0 min')).toBeInTheDocument();
    // Locked is icon + text, never colour alone.
    expect(screen.getByText('Locked')).toBeInTheDocument();
  });

  it('frames the rows as rescheduled, with no count in the heading (D-E6, D13-9)', () => {
    const { container } = render(<MovedForwardList sessions={sessions} />);
    expect(
      screen.getByText('These sessions were rescheduled for you. Nothing was lost.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Moved forward into this plan' }).textContent
    ).not.toMatch(/\d/);
    expect(container.textContent).not.toMatch(/missed|behind|failed|%/i);
  });

  it('renders nothing when no session moved', () => {
    const { container } = render(<MovedForwardList sessions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

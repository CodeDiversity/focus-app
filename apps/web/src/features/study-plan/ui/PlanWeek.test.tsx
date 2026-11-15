import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlanWeek } from './PlanWeek';

const days = [
  {
    date: '2026-10-30',
    sessions: [
      { assignmentTitle: 'Essay', startTime: '09:00', endTime: '10:00', durationMinutes: 60 },
    ],
  },
  { date: '2026-10-31', sessions: [] },
  { date: '2026-11-01', sessions: [] },
  { date: '2026-11-02', sessions: [] },
  { date: '2026-11-03', sessions: [] },
  { date: '2026-11-04', sessions: [] },
  { date: '2026-11-05', sessions: [] },
];

describe('PlanWeek', () => {
  it('renders seven days in order', () => {
    render(<PlanWeek days={days} />);
    // at least the first day section present
    expect(screen.getByLabelText(/2026-10-30/)).toBeInTheDocument();
    expect(screen.getByText('Essay')).toBeInTheDocument();
    // EP13H: the meta line moved to the shared vocabulary ("· 60 min").
    expect(screen.getByText(/09:00 – 10:00 · 60 min/)).toBeInTheDocument();
  });

  it('renders empty state when no sessions', () => {
    const empty = days.map((d) => ({ ...d, sessions: [] }));
    render(<PlanWeek days={empty} />);
    expect(screen.getByTestId('plan-week-empty')).toBeInTheDocument();
  });

  it('session has an accessible name', () => {
    render(<PlanWeek days={days} />);
    expect(screen.getByLabelText(/Essay, 09:00 to 10:00, 60 minutes/)).toBeInTheDocument();
  });

  // ===================== EP13H — flex cards =====================

  it('a flex session reads Anytime with its hint; its slot is never the primary time (D-H1)', () => {
    render(
      <PlanWeek
        days={[
          {
            date: '2026-10-30',
            sessions: [
              {
                assignmentTitle: 'Essay',
                startTime: '19:00',
                endTime: '20:00',
                durationMinutes: 60,
                anchor: 'FLEX_DAY',
                windowHint: 'EVENING',
              },
            ],
          },
        ]}
      />
    );
    expect(screen.getByText('Anytime · 60 min · evening suggested')).toBeInTheDocument();
    expect(screen.queryByText(/19:00 – 20:00/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Essay, anytime, 60 minutes')).toBeInTheDocument();
  });

  it('a fixed session and an omitted anchor keep the clock presentation', () => {
    render(
      <PlanWeek
        days={[
          {
            date: '2026-10-30',
            sessions: [
              {
                assignmentTitle: 'Pinned',
                startTime: '09:00',
                endTime: '10:00',
                durationMinutes: 60,
                anchor: 'FIXED',
                windowHint: null,
              },
              {
                assignmentTitle: 'Legacy',
                startTime: '11:00',
                endTime: '12:00',
                durationMinutes: 60,
              },
            ],
          },
        ]}
      />
    );
    expect(screen.getByText('09:00 – 10:00 · 60 min')).toBeInTheDocument();
    expect(screen.getByText('11:00 – 12:00 · 60 min')).toBeInTheDocument();
    expect(screen.queryByText(/Anytime/)).not.toBeInTheDocument();
  });
});

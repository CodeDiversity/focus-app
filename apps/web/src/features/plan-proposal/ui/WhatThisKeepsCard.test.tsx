import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { WhatThisKeepsCard } from './WhatThisKeepsCard';
import { renderedStrings } from '@/test/forbiddenWords';
import type { MissedSession } from '@/entities/study-plan/model/types';

// The per-card lock toggle calls the entity client; stub it at the boundary.
vi.mock('@/entities/study-plan/api/studyPlanApi', () => ({
  setPlannedSessionLock: vi.fn(),
}));

const lockedSession: MissedSession = {
  id: 'ps-1',
  assignmentId: 'a-1',
  assignmentTitle: 'Lab report',
  date: '2026-10-28',
  startTime: '13:00',
  endTime: '14:00',
  durationMinutes: 60,
  locked: true,
};

function renderCard(overrides: Partial<ComponentProps<typeof WhatThisKeepsCard>> = {}) {
  const props = {
    lockedPreserved: 0,
    completedPreserved: 0,
    lockedSessions: [] as MissedSession[],
    onLockedChange: vi.fn(),
    ...overrides,
  };
  return render(<WhatThisKeepsCard {...props} />);
}

describe('WhatThisKeepsCard (EP16C, ex CatchUpPreservationCard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the counts from lockedPreserved/completedPreserved (neutral copy)', () => {
    renderCard({ lockedPreserved: 2, completedPreserved: 3 });
    expect(screen.getByTestId('catch-up-preservation')).toBeInTheDocument();
    expect(screen.getByText('What this plan keeps')).toBeInTheDocument();
    expect(screen.getByText('2 locked sessions stay exactly where they are.')).toBeInTheDocument();
    expect(screen.getByText('3 completed sessions are kept unchanged.')).toBeInTheDocument();
  });

  it('is absent when both counts are 0 and no preview missed session is locked', () => {
    renderCard();
    expect(screen.queryByTestId('catch-up-preservation')).not.toBeInTheDocument();
  });

  it('renders a locked session as a read-only card — no time/day inputs, no delete', () => {
    const { container } = renderCard({ lockedPreserved: 1, lockedSessions: [lockedSession] });
    expect(screen.getByText('Lab report')).toBeInTheDocument();
    expect(screen.getByText('Wed, Oct 28')).toBeInTheDocument();
    expect(screen.getByText(/13:00 – 14:00/)).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.getByText('Locked sessions are never moved or replaced.')).toBeInTheDocument();

    // Read-only: the card carries no editable inputs at all…
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('select')).toBeNull();
    // …and its only button is the lock toggle — never an editor delete.
    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName(/keep "lab report" locked/i);
    expect(screen.queryByRole('button', { name: /delete session/i })).not.toBeInTheDocument();
  });

  // EP17H-AC7 (D17-17, AC-E17-10): the locked-session line reads in human
  // form; the machine-readable ISO value stays on the `dateTime` attribute.
  it("renders the locked session's day in human form and keeps the ISO dateTime attribute", () => {
    const { container } = renderCard({ lockedPreserved: 1, lockedSessions: [lockedSession] });
    const time = container.querySelector('time');
    expect(time).not.toBeNull();
    expect(time).toHaveTextContent('Wed, Oct 28');
    expect(time).toHaveAttribute('dateTime', '2026-10-28');
    // Nothing a student (or a screen reader) receives is a raw ISO date.
    for (const text of renderedStrings(container)) {
      expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    }
  });
});

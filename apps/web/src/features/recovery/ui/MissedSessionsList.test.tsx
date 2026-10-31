import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MissedSessionsList } from './MissedSessionsList';
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

describe('MissedSessionsList', () => {
  it('renders missed sessions with locked badge', () => {
    render(<MissedSessionsList sessions={sessions} />);
    expect(screen.getByText('Essay')).toBeInTheDocument();
    expect(screen.getByText('2026-10-29')).toBeInTheDocument();
    expect(screen.getByText('09:00 – 10:00')).toBeInTheDocument();
    expect(screen.getByText('1 h 0 min')).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
  });
});

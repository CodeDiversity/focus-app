import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UnfinishedWorkList } from './UnfinishedWorkList';
import type { RemainingWorkItem } from '@/entities/study-plan/model/types';

const item: RemainingWorkItem = {
  assignmentId: 'a-1',
  title: 'Essay',
  courseCode: 'CS101',
  dueDate: '2026-11-01',
  estimatedMinutes: 120,
  confirmedMinutes: 30,
  remainingMinutes: 90,
  status: 'PENDING',
  flagged: null,
};

describe('UnfinishedWorkList', () => {
  it('renders rows and confirmed minutes total', () => {
    render(<UnfinishedWorkList items={[item]} confirmedMinutes={30} />);
    expect(screen.getByText('Essay')).toBeInTheDocument();
    expect(screen.getByText(/CS101/)).toBeInTheDocument();
    expect(screen.getByText(/Due 2026-11-01/)).toBeInTheDocument();
    expect(screen.getByText('30 minutes studied so far')).toBeInTheDocument();
  });
});

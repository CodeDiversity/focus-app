import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FocusAssignmentPanel } from './FocusAssignmentPanel';
import { listAssignments } from '@/entities/assignment/api/assignmentApi';

vi.mock('@/entities/assignment/api/assignmentApi', () => ({
  listAssignments: vi.fn(),
}));

const mocked = vi.mocked(listAssignments);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FocusAssignmentPanel', () => {
  it('shows loading while list resolves', () => {
    mocked.mockImplementation(() => new Promise(() => {}));
    render(<FocusAssignmentPanel assignmentId="a-1" />);
    expect(screen.getByText('Loading assignment…')).toBeInTheDocument();
  });

  it('renders assignment and subtasks', async () => {
    mocked.mockResolvedValue([
      {
        id: 'a-1',
        title: 'Problem Set 4',
        description: null,
        dueDate: '2026-10-12T07:00:00.000Z',
        estimatedHours: 2.5,
        actualHours: null,
        status: 'PENDING',
        priority: 'HIGH',
        type: 'QUIZ',
        createdAt: '2026-10-24T12:00:00.000Z',
        updatedAt: '2026-10-24T12:00:00.000Z',
        course: { id: 'c-1', name: 'Calculus I', code: 'MATH101', color: '#10b981' },
        subtasks: [
          {
            id: 's-1',
            title: 'Read',
            status: 'COMPLETED',
            orderIndex: 0,
            createdAt: 'x',
            updatedAt: 'x',
          },
          {
            id: 's-2',
            title: 'Practice',
            status: 'PENDING',
            orderIndex: 1,
            createdAt: 'x',
            updatedAt: 'x',
          },
        ],
      } as never,
    ]);
    render(<FocusAssignmentPanel assignmentId="a-1" />);
    await waitFor(() => expect(screen.getByText('Problem Set 4')).toBeInTheDocument());
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('To do')).toBeInTheDocument();
    expect(screen.getByText(/Subtasks · 1 of 2 done/)).toBeInTheDocument();
  });

  it('renders empty variant when no assignment', async () => {
    mocked.mockResolvedValue([]);
    render(<FocusAssignmentPanel assignmentId="missing" />);
    await waitFor(() =>
      expect(screen.getByText('No assignment linked to this session')).toBeInTheDocument()
    );
  });

  it('renders empty variant when assignmentId null', () => {
    render(<FocusAssignmentPanel assignmentId={null} />);
    expect(screen.getByText('No assignment linked to this session')).toBeInTheDocument();
  });
});

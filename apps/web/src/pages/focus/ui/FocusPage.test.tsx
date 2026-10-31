import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Providers } from '@/test/providers';
import { FocusPage } from './FocusPage';
import {
  getCurrentStudySession,
  pauseStudySession,
  resumeStudySession,
  finishStudySession,
} from '@/entities/study-session/api/studySessionApi';
import { listAssignments } from '@/entities/assignment/api/assignmentApi';

vi.mock('@/entities/study-session/api/studySessionApi', () => ({
  getCurrentStudySession: vi.fn(),
  pauseStudySession: vi.fn(),
  resumeStudySession: vi.fn(),
  finishStudySession: vi.fn(),
  startStudySession: vi.fn(),
}));

vi.mock('@/entities/assignment/api/assignmentApi', () => ({
  listAssignments: vi.fn(),
}));

const mockedCurrent = vi.mocked(getCurrentStudySession);
const mockedPause = vi.mocked(pauseStudySession);
const mockedResume = vi.mocked(resumeStudySession);
const mockedFinish = vi.mocked(finishStudySession);
const mockedList = vi.mocked(listAssignments);

const activeSession = {
  id: 's-1',
  assignmentId: 'a-1',
  taskId: null,
  status: 'ACTIVE' as const,
  startTime: '2026-10-30T10:00:00.000Z',
  endTime: null,
  elapsedSeconds: 120,
  durationMinutes: 0,
  plannedMinutes: 25,
  notes: null,
  createdAt: '2026-10-30T10:00:00.000Z',
  updatedAt: '2026-10-30T10:00:00.000Z',
};

const assignmentItem = {
  id: 'a-1',
  title: 'Problem Set 4',
  description: null,
  dueDate: '2026-10-12T07:00:00.000Z',
  estimatedHours: 2.5,
  actualHours: null,
  status: 'PENDING' as const,
  priority: 'HIGH' as const,
  type: 'QUIZ' as const,
  createdAt: '2026-10-24T12:00:00.000Z',
  updatedAt: '2026-10-24T12:00:00.000Z',
  course: { id: 'c-1', name: 'Calculus I', code: 'MATH101', color: '#10b981' },
  subtasks: [
    {
      id: 's-1',
      title: 'Read',
      status: 'COMPLETED' as const,
      orderIndex: 0,
      createdAt: 'x',
      updatedAt: 'x',
    },
  ],
};

const renderPage = () =>
  render(
    <Providers initialEntries={['/focus']}>
      <FocusPage />
    </Providers>
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockedList.mockResolvedValue([assignmentItem] as never);
});

describe('FocusPage', () => {
  it('restores an ACTIVE session as running and issues no write on mount', async () => {
    mockedCurrent.mockResolvedValue(activeSession);
    renderPage();
    await waitFor(() => expect(screen.getByText('Focus session running')).toBeInTheDocument());
    expect(mockedCurrent).toHaveBeenCalledTimes(1);
    expect(mockedPause).not.toHaveBeenCalled();
    expect(mockedResume).not.toHaveBeenCalled();
    expect(mockedFinish).not.toHaveBeenCalled();
    expect(screen.getByText('02:00')).toBeInTheDocument();
  });

  it('restores a PAUSED session with Resume control', async () => {
    mockedCurrent.mockResolvedValue({ ...activeSession, status: 'PAUSED', elapsedSeconds: 90 });
    renderPage();
    await waitFor(() => expect(screen.getByText('Focus session paused')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
  });

  it('renders empty state with Go to assignments when no session', async () => {
    mockedCurrent.mockResolvedValue(null);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('No focus session in progress')).toBeInTheDocument()
    );
    expect(screen.getByRole('link', { name: /go to assignments/i })).toBeInTheDocument();
    expect(mockedPause).not.toHaveBeenCalled();
  });

  it('renders assignment title and subtasks', async () => {
    mockedCurrent.mockResolvedValue(activeSession);
    renderPage();
    await waitFor(() => expect(screen.getByText('Problem Set 4')).toBeInTheDocument());
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders in-panel empty variant when no assignment', async () => {
    mockedCurrent.mockResolvedValue({ ...activeSession, assignmentId: null });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('No assignment linked to this session')).toBeInTheDocument()
    );
  });

  it('shows actionable message on failed pause and returns to real state', async () => {
    mockedCurrent.mockResolvedValue(activeSession);
    mockedPause.mockRejectedValueOnce(new Error('Network down'));
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Network down'));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
  });

  it('offers Reload session on 409 and re-runs recovery read', async () => {
    mockedCurrent.mockResolvedValue(activeSession);
    mockedPause.mockRejectedValueOnce({
      response: {
        data: { statusCode: 409, message: 'This session is already paused.', error: 'Conflict' },
      },
      message: 'Request failed',
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Reload session' })).toBeInTheDocument()
    );
    const callsBefore = mockedCurrent.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Reload session' }));
    await waitFor(() => expect(mockedCurrent.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('elapsed display matches server elapsedSeconds right after response', async () => {
    mockedCurrent.mockResolvedValue({ ...activeSession, elapsedSeconds: 42 });
    renderPage();
    await waitFor(() => expect(screen.getByText('00:42')).toBeInTheDocument());
  });

  it('live region text reflects status', async () => {
    mockedCurrent.mockResolvedValue({ ...activeSession, status: 'PAUSED', elapsedSeconds: 10 });
    renderPage();
    await waitFor(() => expect(screen.getByText('Focus session paused')).toBeInTheDocument());
  });

  it('escape is no-op (no dialog/navigation)', async () => {
    mockedCurrent.mockResolvedValue(activeSession);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument());
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });
});

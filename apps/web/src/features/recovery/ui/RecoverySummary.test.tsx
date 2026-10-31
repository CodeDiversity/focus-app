import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RecoverySummary } from './RecoverySummary';
import { getRecoverySummary } from '@/entities/study-plan/api/studyPlanApi';

vi.mock('@/entities/study-plan/api/studyPlanApi', () => ({
  getRecoverySummary: vi.fn(),
}));

const mocked = vi.mocked(getRecoverySummary);

function renderSummary() {
  return render(
    <MemoryRouter>
      <RecoverySummary />
    </MemoryRouter>
  );
}

describe('RecoverySummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons with aria-busy', () => {
    mocked.mockReturnValue(new Promise(() => {}) as never);
    renderSummary();
    expect(screen.getByRole('heading', { name: /catch up/i })).toBeInTheDocument();
    expect(screen.getByText('Missed sessions')).toBeInTheDocument();
    expect(screen.getByText('Unfinished work')).toBeInTheDocument();
    const busy = document.querySelector('[aria-busy="true"]');
    expect(busy).toBeTruthy();
  });

  it('renders empty state and disabled button', async () => {
    mocked.mockResolvedValue({
      missedSessions: [],
      missedCount: 0,
      unfinishedWork: [],
      confirmedMinutes: 0,
      message: "You're all caught up.",
    });
    renderSummary();
    await waitFor(() => expect(screen.getByText(/all caught up/i)).toBeInTheDocument());
    expect(screen.getByText('No missed sessions or unfinished work.')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /create catch-up plan/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders missed sessions and unfinished work with message', async () => {
    mocked.mockResolvedValue({
      missedSessions: [
        {
          id: 'ps-1',
          assignmentId: 'a-1',
          assignmentTitle: 'Essay',
          date: '2026-10-29',
          startTime: '09:00',
          endTime: '10:00',
          durationMinutes: 60,
          locked: false,
        },
      ],
      missedCount: 1,
      unfinishedWork: [
        {
          assignmentId: 'a-2',
          title: 'Reading',
          courseCode: 'HIST',
          dueDate: '2026-11-02',
          estimatedMinutes: 60,
          confirmedMinutes: 10,
          remainingMinutes: 50,
          status: 'PENDING',
          flagged: null,
        },
      ],
      confirmedMinutes: 10,
      message: 'You have some work to catch up on.',
    });
    renderSummary();
    await waitFor(() => expect(screen.getByText('Essay')).toBeInTheDocument());
    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByText('You have some work to catch up on.')).toBeInTheDocument();
    expect(screen.getByText(/10 minutes studied so far/)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /create catch-up plan/i });
    expect(button).not.toBeDisabled();
  });

  it('renders error state with role alert and Try again', async () => {
    mocked.mockRejectedValue(new Error('boom'));
    renderSummary();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/We could not load your recovery summary/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('Try again re-runs getRecoverySummary', async () => {
    mocked.mockRejectedValueOnce(new Error('boom'));
    mocked.mockResolvedValue({
      missedSessions: [],
      missedCount: 0,
      unfinishedWork: [],
      confirmedMinutes: 0,
      message: "You're all caught up.",
    });
    const user = userEvent.setup();
    renderSummary();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(mocked).toHaveBeenCalledTimes(2));
  });
});

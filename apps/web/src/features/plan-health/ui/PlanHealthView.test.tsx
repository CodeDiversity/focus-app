import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { Providers } from '@/test/providers';
import { PlanHealthView } from './PlanHealthView';
import { getRecoverySummary } from '@/entities/study-plan/api/studyPlanApi';
import type { RecoverySummary } from '@/entities/study-plan/model/types';

vi.mock('@/entities/study-plan/api/studyPlanApi', () => ({
  getRecoverySummary: vi.fn(),
  // The shared test store also mounts `todayPlanApi`, which imports this
  // module's `getTodayPlan`; the mock must expose it.
  getTodayPlan: vi.fn(),
}));

const mocked = vi.mocked(getRecoverySummary);

const emptySummary: RecoverySummary = {
  missedSessions: [],
  missedCount: 0,
  rolledForward: [],
  rolledForwardCount: 0,
  rolledForwardMinutes: 0,
  unfinishedWork: [],
  confirmedMinutes: 0,
  message: "Here's where your plan stands.",
};

const movedSummary: RecoverySummary = {
  ...emptySummary,
  rolledForward: [
    {
      id: 'ps-1',
      assignmentId: 'a-1',
      assignmentTitle: 'Essay',
      date: '2026-11-12',
      startTime: '09:00',
      endTime: '10:00',
      durationMinutes: 60,
      locked: false,
    },
  ],
  rolledForwardCount: 1,
  rolledForwardMinutes: 60,
  unfinishedWork: [
    {
      assignmentId: 'a-1',
      title: 'Essay',
      courseCode: 'CS101',
      dueDate: '2026-11-20',
      estimatedMinutes: 120,
      confirmedMinutes: 30,
      remainingMinutes: 90,
      status: 'PENDING',
      flagged: null,
    },
  ],
  confirmedMinutes: 30,
};

function renderView() {
  return render(
    <Providers initialEntries={['/plan/health']}>
      <Routes>
        <Route path="/plan/health" element={<PlanHealthView />} />
        <Route path="/plan/health/catch-up" element={<div>regeneration preview</div>} />
        <Route path="/plan" element={<div>this week&apos;s plan</div>} />
      </Routes>
    </Providers>
  );
}

describe('PlanHealthView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons inside an aria-busy region', () => {
    mocked.mockReturnValue(new Promise(() => {}) as never);
    renderView();
    expect(screen.getByRole('heading', { level: 1, name: 'Plan health' })).toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('surfaces a load failure with an actionable retry (DoD 4, 5)', async () => {
    mocked.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    renderView();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("We couldn't load your plan health.");

    mocked.mockResolvedValue(emptySummary);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('Your plan is up to date')).toBeInTheDocument());
  });

  it('renders the all-clear empty state with a way back to the plan', async () => {
    mocked.mockResolvedValue(emptySummary);
    const user = userEvent.setup();
    renderView();

    await waitFor(() => expect(screen.getByText('Your plan is up to date')).toBeInTheDocument());
    expect(screen.getByText('Your plan is current — nothing needed moving.')).toBeInTheDocument();
    expect(
      screen.getByText('Nothing moved forward and no unfinished work is waiting.')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: "See this week's plan" }));
    expect(screen.getByText("this week's plan")).toBeInTheDocument();
  });

  it('reports moved-forward work and unfinished work informationally', async () => {
    mocked.mockResolvedValue(movedSummary);
    renderView();

    await waitFor(() =>
      expect(
        screen.getByText("Your plan moved unfinished work forward so today's list is current.")
      ).toBeInTheDocument()
    );
    expect(screen.getByRole('heading', { name: 'Moved forward' })).toBeInTheDocument();
    expect(screen.getByText('2026-11-12')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Unfinished work' })).toBeInTheDocument();
    expect(screen.getByText(/Due 2026-11-20/)).toBeInTheDocument();
  });

  it('offers regeneration as a secondary action that is never disabled (D-E7)', async () => {
    mocked.mockResolvedValue(emptySummary);
    const user = userEvent.setup();
    renderView();

    const regenerate = await screen.findByRole('button', { name: 'Regenerate my week' });
    expect(regenerate).toBeEnabled();
    expect(regenerate).not.toHaveAttribute('aria-disabled', 'true');

    await user.click(regenerate);
    expect(screen.getByText('regeneration preview')).toBeInTheDocument();
  });

  it('never leads with a count and carries no shaming or compliance copy (AC-1, D13-9)', async () => {
    mocked.mockResolvedValue(movedSummary);
    const { container } = renderView();

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Moved forward' })).toBeVisible()
    );

    const headings = screen.getAllByRole('heading');
    for (const heading of headings) {
      expect(heading.textContent ?? '').not.toMatch(/\d/);
    }
    expect(container.textContent).not.toMatch(/missed|behind|fell behind|failed|catch up on/i);
    expect(container.textContent).not.toMatch(/\d+\s*%/);
  });

  it('keeps every control keyboard reachable', async () => {
    mocked.mockResolvedValue(emptySummary);
    const user = userEvent.setup();
    renderView();

    await screen.findByText('Your plan is up to date');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Regenerate my week' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: "See this week's plan" })).toHaveFocus();
  });
});

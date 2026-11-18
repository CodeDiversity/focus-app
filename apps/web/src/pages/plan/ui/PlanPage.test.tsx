import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Providers } from '@/test/providers';
import { PlanPage, EMPTY_WEEK_COPY } from './PlanPage';
import {
  listStudyPlan,
  listRemainingWork,
  previewCatchUp,
  previewStudyPlan,
} from '@/entities/study-plan/api/studyPlanApi';
import { expectNoForbiddenWords } from '@/test/forbiddenWords';

vi.mock('@/entities/study-plan/api/studyPlanApi', () => ({
  previewStudyPlan: vi.fn(),
  saveStudyPlan: vi.fn(),
  previewCatchUp: vi.fn(),
  listStudyPlan: vi.fn(),
  listRemainingWork: vi.fn(),
  getTodayPlan: vi.fn(),
  getRecoverySummary: vi.fn(),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

const mockedList = vi.mocked(listStudyPlan);
const mockedRemainingWork = vi.mocked(listRemainingWork);

const BROWSER_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const emptySaved = {
  from: '2026-10-30',
  to: '2026-11-05',
  timeZone: BROWSER_ZONE,
  days: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-10-${30 + i}`,
    targetMinutes: 0,
    sessions: [],
  })),
};

const savedFixture = {
  ...emptySaved,
  days: [
    {
      date: '2026-10-30',
      targetMinutes: 60,
      sessions: [
        {
          id: 's-1',
          assignmentId: 'a-1',
          assignmentTitle: 'Essay',
          startTime: '09:00',
          endTime: '10:00',
          durationMinutes: 60,
          status: 'SCHEDULED',
          anchor: 'FIXED',
          windowHint: null,
        },
      ],
    },
    ...emptySaved.days.slice(1),
  ],
};

function renderPage() {
  return render(
    <Providers>
      <MemoryRouter>
        <PlanPage />
      </MemoryRouter>
    </Providers>
  );
}

const primaryButtons = () =>
  screen.getAllByRole('button').filter((b) => b.classList.contains('bg-accent'));

describe('PlanPage (EP16C-AC1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue(emptySaved as never);
    mockedRemainingWork.mockResolvedValue({ items: [], unattributedConfirmedMinutes: 0 } as never);
  });

  it('h1 "Plan", the saved week and Remaining work; title set', async () => {
    mockedList.mockResolvedValue(savedFixture as never);
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Plan' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('plan-week')).toBeInTheDocument());
    expect(screen.getByTestId('plan-week')).toHaveTextContent('Essay');
    expect(screen.getByRole('heading', { name: /remaining work/i })).toBeInTheDocument();
    expect(document.title).toBe('Plan — StudyPilot');
  });

  it('empty saved plan shows the empty sentence and Plan my week', async () => {
    renderPage();
    expect(await screen.findByText(EMPTY_WEEK_COPY)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plan my week' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Replan my week' })).toBeNull();
  });

  it('a saved session switches the action to Replan my week', async () => {
    mockedList.mockResolvedValue(savedFixture as never);
    renderPage();
    expect(await screen.findByRole('button', { name: 'Replan my week' })).toBeInTheDocument();
  });

  it('the action navigates to /plan/proposal and calls no preview endpoint', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Plan my week' }));
    expect(navigate).toHaveBeenCalledWith('/plan/proposal');
    expect(vi.mocked(previewCatchUp)).not.toHaveBeenCalled();
    expect(vi.mocked(previewStudyPlan)).not.toHaveBeenCalled();
  });

  it('while the saved read loads, the week skeleton shows and a placeholder holds the action (D-C7)', () => {
    mockedList.mockReturnValue(new Promise(() => {}) as never);
    renderPage();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByTestId('plan-action-placeholder')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /my week$/ })).toBeNull();
  });

  it('a failed saved read shows the error with an outline Try again and still offers Plan my week; Try again re-reads with no parameters; Remaining work still renders', async () => {
    mockedList.mockRejectedValueOnce(new Error('Network Error'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Network Error');
    const retry = screen.getByRole('button', { name: 'Try again' });
    expect(retry.classList.contains('bg-accent')).toBe(false);
    expect(screen.getByRole('button', { name: 'Plan my week' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /remaining work/i })).toBeInTheDocument();
    await userEvent.click(retry);
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
    expect(mockedList).toHaveBeenLastCalledWith();
    expect(await screen.findByText(EMPTY_WEEK_COPY)).toBeInTheDocument();
  });

  it('no TodayPlanCard, no Generate plan / Save plan, no plan note (negatives); exactly one primary button', async () => {
    mockedList.mockResolvedValue(savedFixture as never);
    renderPage();
    await screen.findByRole('button', { name: 'Replan my week' });
    expect(screen.queryByRole('heading', { name: /today's plan/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /generate plan|save plan/i })).toBeNull();
    expect(screen.queryByTestId('moved-forward-note')).toBeNull();
    expect(screen.queryByTestId('plan-note')).toBeNull();
    expect(primaryButtons()).toHaveLength(1);
  });

  it('the window line has no IANA id when the zones match (D-C5)', async () => {
    mockedList.mockResolvedValue(savedFixture as never);
    renderPage();
    expect(await screen.findByText('Oct 30, 2026 – Nov 5, 2026')).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(BROWSER_ZONE.replace('/', '\\/')))).toBeNull();
  });

  it('EP16C-AC5: copy audit — loading, error, empty, saved', async () => {
    mockedList.mockReturnValueOnce(new Promise(() => {}) as never);
    let view = renderPage();
    expectNoForbiddenWords(view.container);
    view.unmount();
    mockedList.mockRejectedValueOnce(new Error('Service unavailable'));
    view = renderPage();
    await screen.findByRole('alert');
    expectNoForbiddenWords(view.container);
    view.unmount();
    view = renderPage();
    await screen.findByText(EMPTY_WEEK_COPY);
    expectNoForbiddenWords(view.container);
    view.unmount();
    mockedList.mockResolvedValue(savedFixture as never);
    view = renderPage();
    await screen.findByRole('button', { name: 'Replan my week' });
    expectNoForbiddenWords(view.container);
  });
});

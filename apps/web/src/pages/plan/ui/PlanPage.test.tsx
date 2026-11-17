import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Providers } from '@/test/providers';
import { PlanPage } from './PlanPage';
import {
  previewStudyPlan,
  saveStudyPlan,
  listStudyPlan,
  listRemainingWork,
  getTodayPlan,
  getRecoverySummary,
} from '@/entities/study-plan/api/studyPlanApi';

vi.mock('@/entities/study-plan/api/studyPlanApi', () => ({
  previewStudyPlan: vi.fn(),
  saveStudyPlan: vi.fn(),
  listStudyPlan: vi.fn(),
  listRemainingWork: vi.fn(),
  // EP13D: the shared test store mounts `todayPlanApi`, which imports this
  // module's `getTodayPlan`; EP13E adds `planHealthApi` over
  // `getRecoverySummary`. The mock must expose both.
  getTodayPlan: vi.fn(),
  getRecoverySummary: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockedPreview = vi.mocked(previewStudyPlan);
const mockedSave = vi.mocked(saveStudyPlan);
const mockedList = vi.mocked(listStudyPlan);
const mockedRemainingWork = vi.mocked(listRemainingWork);
const mockedToday = vi.mocked(getTodayPlan);
const mockedPlanHealth = vi.mocked(getRecoverySummary);

/** EP13E: today's plan (EP13D's card) and the plan-health read. */
const emptyToday = {
  date: '2026-10-30',
  timeZone: 'America/New_York',
  sessions: [],
  nextSession: null,
  nextSessionReason: 'NO_PLAN' as const,
  confirmedMinutesToday: 0,
};

const emptyPlanHealth = {
  missedSessions: [],
  missedCount: 0,
  rolledForward: [],
  rolledForwardCount: 0,
  rolledForwardMinutes: 0,
  unfinishedWork: [],
  confirmedMinutes: 0,
  message: "Here's where your plan stands.",
};

const emptySaved = {
  from: '2026-10-30',
  to: '2026-11-05',
  timeZone: 'America/New_York',
  days: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-10-${30 + i}`,
    targetMinutes: 0,
    sessions: [],
  })),
};

const previewFixture = {
  from: '2026-10-30',
  to: '2026-11-05',
  timeZone: 'America/New_York',
  generatedAt: '2026-10-30T12:00:00.000Z',
  preferences: {
    sessionLengthMinutes: 60,
    minSessionMinutes: 15,
    maxSessionMinutes: 120,
    dailyCapMinutes: 240,
  },
  days: [
    {
      date: '2026-10-30',
      targetMinutes: 60,
      sessions: [
        {
          assignmentId: 'a-1',
          assignmentTitle: 'Essay',
          startTime: '09:00',
          endTime: '10:00',
          durationMinutes: 60,
        },
      ],
    },
    ...Array.from({ length: 6 }, (_, i) => ({
      date: `2026-10-${31 + i}`,
      targetMinutes: 0,
      sessions: [],
    })),
  ],
  warnings: [],
  deferred: [],
  calibration: [],
};

const savedFixture = {
  from: '2026-10-30',
  to: '2026-11-05',
  timeZone: 'America/New_York',
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
        },
      ],
    },
    ...Array.from({ length: 6 }, (_, i) => ({
      date: `2026-10-${31 + i}`,
      targetMinutes: 0,
      sessions: [],
    })),
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

describe('PlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue(emptySaved as never);
    mockedRemainingWork.mockResolvedValue({ items: [], unattributedConfirmedMinutes: 0 } as never);
    mockedToday.mockResolvedValue(emptyToday as never);
    mockedPlanHealth.mockResolvedValue(emptyPlanHealth as never);
  });

  it('initial state offers the generate action', async () => {
    renderPage();
    await waitFor(() => expect(mockedList).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /generate plan/i })).toBeInTheDocument();
  });

  it('generating renders the preview days and sessions', async () => {
    mockedPreview.mockResolvedValue(previewFixture as never);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(mockedList).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /generate plan/i }));
    await waitFor(() => expect(mockedPreview).toHaveBeenCalled());
    expect(screen.getAllByText('Essay').length).toBeGreaterThan(0);
  });

  it('a calibrated preview renders the neutral calibration note above the week (EP13L-AC4)', async () => {
    mockedPreview.mockResolvedValue({
      ...previewFixture,
      calibration: [{ assignmentType: 'PAPER', multiplier: 1.6, samples: 4 }],
    } as never);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(mockedList).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /generate plan/i }));
    await waitFor(() => expect(mockedPreview).toHaveBeenCalled());
    expect(
      screen.getByRole('note', { name: 'How your estimates were adjusted' })
    ).toHaveTextContent(
      'Your papers usually take about 1.6× your estimate, so we planned for that.'
    );
  });

  it('an uncalibrated preview renders no calibration note (EP13L-AC3)', async () => {
    mockedPreview.mockResolvedValue(previewFixture as never);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(mockedList).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /generate plan/i }));
    await waitFor(() => expect(mockedPreview).toHaveBeenCalled());
    expect(screen.queryByTestId('calibration-note')).not.toBeInTheDocument();
  });

  it('save posts projected four-field sessions and renders saved week', async () => {
    mockedPreview.mockResolvedValue(previewFixture as never);
    mockedSave.mockResolvedValue(savedFixture as never);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(mockedList).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /generate plan/i }));
    await waitFor(() => expect(mockedPreview).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /save plan/i }));
    await waitFor(() => expect(mockedSave).toHaveBeenCalled());
    const call = mockedSave.mock.calls[0];
    expect(call[0]).toBe('2026-10-30');
    expect(call[1]).toBe('2026-11-05');
    expect(call[2]).toEqual([
      { assignmentId: 'a-1', date: '2026-10-30', startTime: '09:00', endTime: '10:00' },
    ]);
    await waitFor(() => expect(screen.getByText('Essay')).toBeInTheDocument());
  });

  it('a 409 is rendered as a conflict with the offending session and reason', async () => {
    mockedPreview.mockResolvedValue(previewFixture as never);
    mockedSave.mockRejectedValue({
      response: {
        data: {
          statusCode: 409,
          error: 'Conflict',
          conflicts: [
            { sessionIndex: 0, date: '2026-10-30', startTime: '09:00', reason: 'OVERLAPS_CLASS' },
          ],
        },
      },
      message: 'conflict',
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(mockedList).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /generate plan/i }));
    await waitFor(() => expect(mockedPreview).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /save plan/i }));
    await waitFor(() => expect(screen.getByTestId('conflict-summary')).toBeInTheDocument());
    expect(screen.getByText(/OVERLAPS_CLASS|overlaps a class/i)).toBeInTheDocument();
  });

  it('a failed preview renders a readable error', async () => {
    mockedPreview.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(mockedList).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /generate plan/i }));
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
  });

  it('rollover renders the rolled-over message and generate action', async () => {
    mockedPreview.mockResolvedValue(previewFixture as never);
    mockedSave.mockRejectedValue({
      response: {
        data: {
          statusCode: 409,
          error: 'WINDOW_ROLLED_OVER',
          message: 'rolled',
        },
      },
      message: 'rolled',
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(mockedList).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /generate plan/i }));
    await waitFor(() => expect(mockedPreview).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /save plan/i }));
    await waitFor(() => expect(screen.getByText(/week has rolled over/i)).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: /generate plan/i }).length).toBeGreaterThan(0);
  });

  it('reads the saved plan on mount with no query parameters', async () => {
    mockedList.mockResolvedValue(savedFixture as never);
    renderPage();
    await waitFor(() => expect(mockedList).toHaveBeenCalled());
    // listStudyPlan called with no args
    expect(mockedList).toHaveBeenCalledWith();
    await waitFor(() => expect(screen.getByText('Essay')).toBeInTheDocument());
  });

  // -------------------------------------------------------------------------
  // EP13E — today-first framing (AC-1, D-E10) and the return note (AC-4, D-E11)
  // -------------------------------------------------------------------------

  it("leads with today's plan, above the week region (AC-1)", async () => {
    mockedList.mockResolvedValue(savedFixture as never);
    renderPage();

    const todayHeading = await screen.findByRole('heading', { name: /today's plan/i });
    await waitFor(() => expect(screen.getByText('Essay')).toBeInTheDocument());

    const pageHeading = screen.getByRole('heading', { level: 1, name: 'Plan' });
    const week = screen.getByText(/2026-10-30 – 2026-11-05/);
    // DOM order: page heading → today's plan → the week.
    expect(pageHeading.compareDocumentPosition(todayHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(todayHeading.compareDocumentPosition(week)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("renders today's plan while the saved-plan read is still loading", async () => {
    mockedList.mockReturnValue(new Promise(() => {}) as never);
    renderPage();
    expect(await screen.findByRole('heading', { name: /today's plan/i })).toBeInTheDocument();
  });

  it("renders today's plan even when the saved-plan read fails, with a scoped retry", async () => {
    mockedList.mockRejectedValue(new Error('boom'));
    renderPage();

    expect(await screen.findByRole('heading', { name: /today's plan/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('shows no return note when nothing moved forward', async () => {
    renderPage();
    await waitFor(() => expect(mockedPlanHealth).toHaveBeenCalled());
    expect(screen.queryByTestId('moved-forward-note')).not.toBeInTheDocument();
  });

  it('shows one neutral, number-free return note when work moved forward (AC-4)', async () => {
    mockedPlanHealth.mockResolvedValue({
      ...emptyPlanHealth,
      rolledForward: [
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
      rolledForwardCount: 1,
      rolledForwardMinutes: 60,
    } as never);
    renderPage();

    const note = await screen.findByTestId('moved-forward-note');
    expect(note).toHaveTextContent(
      "Some earlier sessions moved into your current plan — today's list is up to date."
    );
    // No counts, no percentages, no shaming terms (D13-9).
    expect(note.textContent ?? '').not.toMatch(/\d/);
    expect(note.textContent ?? '').not.toMatch(/missed|behind|failed|%/i);
    expect(screen.getByRole('link', { name: 'See plan health' })).toHaveAttribute(
      'href',
      '/plan/health'
    );
  });

  // -------------------------------------------------------------------------
  // EP14F — a late saved-plan read never overrides a newer action (TR-E14-07)
  // -------------------------------------------------------------------------

  it('a saved-plan read that resolves after Generate leaves the preview on screen (EP14F-AC1)', async () => {
    let resolveList: (plan: typeof emptySaved) => void = () => {};
    mockedList.mockReturnValue(
      new Promise<typeof emptySaved>((resolve) => {
        resolveList = resolve;
      }) as never
    );
    mockedPreview.mockResolvedValue(previewFixture as never);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(mockedList).toHaveBeenCalled());

    // The student acts while the mount-time read is still in flight.
    await user.click(screen.getByRole('button', { name: /generate plan/i }));
    await waitFor(() => expect(mockedPreview).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save plan/i })).toBeInTheDocument()
    );

    // The late read resolves with "no sessions" — it must not flip the page back.
    resolveList(emptySaved);
    await waitFor(() => expect(screen.getAllByText('Essay').length).toBeGreaterThan(0));
    expect(screen.queryByTestId('plan-initial')).not.toBeInTheDocument();
    expect(screen.queryByText('No plan yet.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save plan/i })).toBeInTheDocument();
  });

  it('a saved-plan read that resolves before any action sets saved (EP14F-AC1)', async () => {
    mockedList.mockResolvedValue(savedFixture as never);
    renderPage();
    await waitFor(() => expect(screen.getByText('Essay')).toBeInTheDocument());
    expect(screen.queryByTestId('plan-initial')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save plan/i })).not.toBeInTheDocument();
  });

  it('a saved-plan read that resolves before any action sets initial (EP14F-AC1)', async () => {
    mockedList.mockResolvedValue(emptySaved as never);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('plan-initial')).toBeInTheDocument());
    expect(screen.getByText('No plan yet.')).toBeInTheDocument();
  });

  it('Try again after a failed read sets the mode from the retry result (EP14F-AC2)', async () => {
    mockedList.mockRejectedValueOnce(new Error('boom'));
    mockedPreview.mockResolvedValue(previewFixture as never);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    );

    // The student has acted (Generate) — the guard is armed — but a retry is
    // student-initiated, so its result still owns the mode.
    await user.click(screen.getByRole('button', { name: /generate plan/i }));
    await waitFor(() => expect(mockedPreview).toHaveBeenCalled());

    mockedList.mockResolvedValueOnce(savedFixture as never);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('Essay')).toBeInTheDocument());
    // Saved mode, not preview: no "Save plan" action and no empty state.
    expect(screen.queryByRole('button', { name: /save plan/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('plan-initial')).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlanProposal, proposalSummary } from './PlanProposal';
import { expectNoForbiddenWords } from '@/test/forbiddenWords';
import { Providers, makeTestStore } from '@/test/providers';
import { todayPlanApi } from '@/features/today-plan/api/todayPlanApi';
import { calendarApi } from '@/features/calendar/api/calendarApi';
import { recoverySummaryApi } from '@/features/today/api/recoverySummaryApi';
import {
  previewCatchUp,
  confirmCatchUpPlan,
  setPlannedSessionLock,
} from '@/entities/study-plan/api/studyPlanApi';

vi.mock('@/entities/study-plan/api/studyPlanApi', async (importOriginal) => ({
  // F-EP16F-02: the surface now imports the RTK slices whose caches it resets,
  // and those import the rest of the entity client.
  ...(await importOriginal<typeof import('@/entities/study-plan/api/studyPlanApi')>()),
  previewCatchUp: vi.fn(),
  confirmCatchUpPlan: vi.fn(),
  setPlannedSessionLock: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

const mockedPreview = vi.mocked(previewCatchUp);
const mockedConfirm = vi.mocked(confirmCatchUpPlan);
const mockedLock = vi.mocked(setPlannedSessionLock);

const catchUpPreviewFixture = {
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
          // EP13H: the catch-up preview carries the EP13G partition too.
          anchor: 'FIXED',
          windowHint: null,
        },
      ],
    },
    // Valid civil dates (EP17E: dayLabel parses them; 2026-10-32 is not a day).
    ...['2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'].map(
      (date) => ({ date, targetMinutes: 0, sessions: [] })
    ),
  ],
  warnings: [
    {
      assignmentId: 'a-2',
      assignmentTitle: 'Lab report',
      category: 'INSUFFICIENT_TIME_BEFORE_DEADLINE',
      minutes: 30,
      dueDate: '2026-11-02',
    },
  ],
  deferred: [],
  missedSessions: [
    {
      id: 'ps-1',
      assignmentId: 'a-2',
      assignmentTitle: 'Lab report',
      date: '2026-10-28',
      startTime: '13:00',
      endTime: '14:00',
      durationMinutes: 60,
      locked: true,
    },
    {
      id: 'ps-2',
      assignmentId: 'a-1',
      assignmentTitle: 'Essay',
      date: '2026-10-29',
      startTime: '09:00',
      endTime: '10:00',
      durationMinutes: 60,
      locked: false,
    },
  ],
  lockedPreserved: 1,
  completedPreserved: 2,
  calibration: [],
};

/** The deep-link case: mount the surface directly (no prior navigation). */
function renderPreview() {
  return render(
    <Providers>
      <MemoryRouter>
        <PlanProposal />
      </MemoryRouter>
    </Providers>
  );
}

describe('PlanProposal (EP16C, ported from CatchUpPreview)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPreview.mockResolvedValue(catchUpPreviewFixture as never);
    mockedLock.mockResolvedValue({ id: 'ps-1', locked: false } as never);
  });

  it('fetches previewCatchUp on mount and renders proposed sessions grouped by day', async () => {
    const { container } = renderPreview();
    await waitFor(() => expect(mockedPreview).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    // EP17E (AC-E17-09): the week renders once — no second editor region.
    expect(container.querySelectorAll('[data-testid="editable-week"] > section')).toHaveLength(7);
    expect(screen.queryByTestId('plan-week')).toBeNull();
    expect(screen.queryByTestId('plan-session-editor')).toBeNull();
    expect(screen.getByTestId('editable-week')).toHaveTextContent('Essay');
    // The window line names the server-proposed window without a raw zone id (D-C5).
    expect(screen.getByText(/Oct 30, 2026 – Nov 5, 2026/)).toBeInTheDocument();
    expect(screen.queryByText(/America\/New_York/)).toBeNull();
  });

  it('editing a proposed session then Use this plan posts the exact confirm body (incl. the anchor)', async () => {
    mockedConfirm.mockResolvedValue({} as never);
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());

    // EP17E: the session is edited in place — open its card, then edit.
    await user.click(screen.getByRole('button', { name: /essay 09:00/i }));
    await user.click(screen.getByRole('button', { name: /move later/i }));
    await waitFor(() =>
      expect(screen.getByTestId('editable-week')).toHaveTextContent('09:15 – 10:15')
    );

    await user.click(screen.getByRole('button', { name: /use this plan/i }));
    await waitFor(() => expect(mockedConfirm).toHaveBeenCalledTimes(1));
    const [from, to, sessions] = mockedConfirm.mock.calls[0];
    expect(from).toBe('2026-10-30');
    expect(to).toBe('2026-11-05');
    expect(sessions).toEqual([
      {
        assignmentId: 'a-1',
        date: '2026-10-30',
        startTime: '09:15',
        endTime: '10:15',
        anchor: 'FIXED',
      },
    ]);
    // Exactly the save-body fields (EP13H: + anchor; a fixed session never
    // carries a windowHint key at all — the server 400s one).
    expect(Object.keys(sessions[0]).sort()).toEqual([
      'anchor',
      'assignmentId',
      'date',
      'endTime',
      'startTime',
    ]);
  });

  it('"Not now" navigates to /plan and makes no confirm call', async () => {
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());

    const callsBefore = mockedPreview.mock.calls.length;
    await user.click(screen.getByRole('button', { name: /not now/i }));
    expect(mockedConfirm).not.toHaveBeenCalled();
    expect(mockedPreview).toHaveBeenCalledTimes(callsBefore);
    expect(navigate).toHaveBeenCalledWith('/plan');
  });

  it('a 409 conflict marks the offending rows and lists reasons; edits are preserved', async () => {
    mockedConfirm.mockRejectedValue({
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
    } as never);
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /essay 09:00/i }));
    await user.click(screen.getByRole('button', { name: /move later/i }));
    await user.click(screen.getByRole('button', { name: /use this plan/i }));

    await waitFor(() => expect(screen.getByTestId('conflict-summary')).toBeInTheDocument());
    expect(screen.getByTestId('conflict-summary')).toHaveTextContent(
      /some sessions clash with your calendar\. adjust them and try again:/i
    );
    expect(screen.getByTestId('conflict-summary')).toHaveTextContent(/overlaps a class/i);
    // The offending card is marked — and the student's edit survives.
    const row = screen.getByTestId('editable-week').querySelector('article');
    expect(row?.className).toContain('border-danger');
    expect(row).toHaveTextContent('09:15 – 10:15');
  });

  it('WINDOW_ROLLED_OVER shows the banner and "Create new plan" re-runs the preview, focus returns to the h1', async () => {
    mockedConfirm.mockRejectedValue({
      response: {
        data: {
          statusCode: 409,
          error: 'WINDOW_ROLLED_OVER',
          message: 'The plan week has rolled over — generate a new proposal to save it.',
        },
      },
      message: 'rolled',
    } as never);
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /use this plan/i }));
    await waitFor(() =>
      expect(screen.getByText(/this proposal's week has ended/i)).toBeInTheDocument()
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    // The proposal is gone — only the regeneration affordance remains.
    expect(screen.queryByTestId('editable-week')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create new plan/i }));
    await waitFor(() => expect(mockedPreview).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: 'Your proposed week' })).toHaveFocus();
  });

  it('a 400 field error surfaces the server message via the getErrorMessage toast path', async () => {
    mockedConfirm.mockRejectedValue({
      response: {
        data: {
          statusCode: 400,
          error: 'Bad Request',
          message: ['to must be exactly six days after from'],
          errors: { to: ['to must be exactly six days after from'] },
        },
      },
      message: 'to must be exactly six days after from',
    } as never);
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /use this plan/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('to must be exactly six days after from')
    );
  });

  it('shows the week skeleton with aria-busy while loading, and only Not now in the header', () => {
    mockedPreview.mockReturnValue(new Promise(() => {}) as never);
    renderPreview();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByTestId('editable-week')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /use this plan/i })).toBeNull();
    expect(screen.getByRole('button', { name: /not now/i })).toBeInTheDocument();
  });

  it('shows the empty state when no sessions are proposed', async () => {
    mockedPreview.mockResolvedValue({
      ...catchUpPreviewFixture,
      days: catchUpPreviewFixture.days.map((d) => ({ ...d, sessions: [], targetMinutes: 0 })),
      lockedPreserved: 0,
      completedPreserved: 0,
      missedSessions: [],
      warnings: [],
    } as never);
    renderPreview();
    await waitFor(() => expect(screen.getByText('Nothing new to schedule')).toBeInTheDocument());
    expect(
      screen.getByText(
        "Your unfinished work didn't need any new sessions this week. Check the workload warnings below."
      )
    ).toBeInTheDocument();
    // D-C8: no second "go back" control — Not now in the header does that; Use this plan stays (A-C5).
    expect(screen.queryByRole('button', { name: /back to/i })).toBeNull();
    expect(screen.getByRole('button', { name: /use this plan/i })).toBeInTheDocument();
    expect(screen.queryByTestId('editable-week')).not.toBeInTheDocument();
    expect(screen.queryByTestId('proposal-summary')).toBeNull();
  });

  it('a failed preview shows the error card; Try again re-runs it and focus returns to the h1', async () => {
    mockedPreview.mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    const errorLine = screen.getByText(/we couldn't build a plan proposal\. try again\./i);
    // R-EP16-01: danger text on the 10% danger tint must use the ≥4.5:1 token.
    expect(errorLine).toHaveClass('text-danger-strong');
    expect(screen.queryByRole('button', { name: /back to/i })).toBeNull();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(mockedPreview).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: 'Your proposed week' })).toHaveFocus();
  });

  it('renders locked preview sessions in "What this plan keeps", never as editor rows', async () => {
    const { getByTestId } = renderPreview();
    await waitFor(() => expect(getByTestId('editable-week')).toBeInTheDocument());
    // The locked missed session is only in the preservation card…
    expect(screen.getByTestId('catch-up-preservation')).toHaveTextContent('Lab report');
    // …never in the editable week (proposed sessions are the only editable cards).
    expect(getByTestId('editable-week')).not.toHaveTextContent('Lab report');
  });

  it('reverts the toggle on failure, explains it, and keeps the plan editable', async () => {
    mockedLock.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /keep "lab report" locked/i })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /keep "lab report" locked/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent(
      /we couldn't update that session's lock\. try again\./i
    );
    // the plan stays editable; nothing was confirmed
    expect(screen.getByTestId('editable-week')).toBeInTheDocument();
    expect(mockedConfirm).not.toHaveBeenCalled();
    // the toggle itself reverts to its previous state (still locked)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /keep "lab report" locked/i })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    );
  });

  it('keeps a persisted unlock when a later confirm fails; only the new conflict shows', async () => {
    mockedConfirm.mockRejectedValue({
      response: {
        data: {
          statusCode: 409,
          error: 'Conflict',
          conflicts: [
            { sessionIndex: 0, date: '2026-10-30', startTime: '09:15', reason: 'OVERLAPS_CLASS' },
          ],
        },
      },
      message: 'conflict',
    } as never);
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());

    // unlock the locked missed session (succeeds; the preservation list empties)
    await user.click(screen.getByRole('button', { name: /keep "lab report" locked/i }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /keep "lab report" locked/i })).toBeNull()
    );

    // a failing confirm shows only the new conflict — the unlock is not rolled back
    await user.click(screen.getByRole('button', { name: /use this plan/i }));
    await waitFor(() => expect(screen.getByTestId('conflict-summary')).toBeInTheDocument());
    expect(screen.getByTestId('conflict-summary')).toHaveTextContent(/overlaps a class/i);
    // D-C11: the inline summary is the one message — no conflict toast at all.
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /keep "lab report" locked/i })).toBeNull();
    expect(screen.getByTestId('editable-week')).toBeInTheDocument();
  });

  it('is keyboard operable — Tab/Enter reach and operate every header/editor/toggle control', async () => {
    mockedConfirm.mockResolvedValue({} as never);
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());

    // Focus entered on the heading; Tab reaches the header controls.
    const heading = screen.getByRole('heading', { name: /your proposed week/i, level: 1 });
    expect(document.activeElement).toBe(heading);
    await user.tab();
    expect(screen.getByRole('button', { name: /use this plan/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /not now/i })).toHaveFocus();

    // EP17E: open the session's in-place panel, then its controls respond
    // to Enter.
    const card = screen.getByRole('button', { name: /essay 09:00/i });
    card.focus();
    await user.keyboard('{Enter}');
    const moveLater = screen.getByRole('button', { name: /move later/i });
    moveLater.focus();
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(screen.getByTestId('editable-week')).toHaveTextContent('09:15 – 10:15')
    );

    // The lock toggle responds to Enter.
    const lockToggle = screen.getByRole('button', { name: /keep "lab report" locked/i });
    lockToggle.focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(mockedLock).toHaveBeenCalledWith('ps-1', false));
    // The persisted unlock syncs the surface: the locked card (and its
    // toggle) leaves the preservation list.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /keep "lab report" locked/i })).toBeNull()
    );
  });

  it('moves focus to the h1 "Your proposed week" on entry', async () => {
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: 'Your proposed week' })).toHaveFocus();
  });

  it('"Moved forward into this plan" lists missedSessions and is absent when empty; "What this plan keeps" is absent when nothing is kept', async () => {
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    expect(
      screen.getByRole('heading', { level: 2, name: 'Moved forward into this plan' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'What this plan keeps' })
    ).toBeInTheDocument();
    cleanup();
    mockedPreview.mockResolvedValue({
      ...catchUpPreviewFixture,
      missedSessions: [],
      lockedPreserved: 0,
      completedPreserved: 0,
    } as never);
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Moved forward into this plan' })
    ).toBeNull();
    expect(screen.queryByRole('heading', { level: 2, name: 'What this plan keeps' })).toBeNull();
  });

  it('section order: calibration, week, editor, keeps, moved forward, warnings (D-C6)', async () => {
    mockedPreview.mockResolvedValue({
      ...catchUpPreviewFixture,
      calibration: [{ assignmentType: 'ESSAY', multiplier: 1.5, samples: 4 }],
    } as never);
    const { container } = renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    const markers = Array.from(
      container.querySelectorAll(
        '[data-testid="calibration-note"], [data-testid="editable-week"], [data-testid="catch-up-preservation"], [aria-labelledby="proposal-moved-heading"], [data-testid="workload-warnings"]'
      )
    ).map((el) => el.getAttribute('data-testid') ?? el.getAttribute('aria-labelledby'));
    expect(markers.filter(Boolean)).toEqual(
      [
        'calibration-note',
        'editable-week',
        'catch-up-preservation',
        'proposal-moved-heading',
        'workload-warnings',
      ].filter((m) => markers.includes(m))
    );
    expect(markers.indexOf('editable-week')).toBeLessThan(markers.indexOf('catch-up-preservation'));
    expect(markers.indexOf('catch-up-preservation')).toBeLessThan(
      markers.indexOf('proposal-moved-heading')
    );
  });

  it('confirm success toasts "Plan saved." and navigates to /today; while confirming Use this plan is busy and Not now stays enabled', async () => {
    let resolve!: () => void;
    mockedConfirm.mockReturnValue(new Promise<void>((r) => (resolve = r)) as never);
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /use this plan/i }));
    const confirmBtn = screen.getByRole('button', { name: /use this plan/i });
    expect(confirmBtn).toBeDisabled();
    expect(confirmBtn).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: /not now/i })).toBeEnabled();
    resolve();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plan saved.'));
    expect(navigate).toHaveBeenCalledWith('/today');
  });

  it("F-EP16F-02: Use this plan drops Today's cached plan, calendar and summary before navigating", async () => {
    mockedConfirm.mockResolvedValue(undefined as never);
    // Record every action the surface dispatches through the real store.
    const store = makeTestStore();
    const dispatched: string[] = [];
    const realDispatch = store.dispatch;
    store.dispatch = ((action: { type: string }) => {
      dispatched.push(action.type);
      return realDispatch(action);
    }) as typeof store.dispatch;
    const user = userEvent.setup();
    render(
      <Providers store={store}>
        <MemoryRouter>
          <PlanProposal />
        </MemoryRouter>
      </Providers>
    );
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /use this plan/i }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/today'));
    for (const api of [todayPlanApi, calendarApi, recoverySummaryApi]) {
      expect(dispatched).toContain(api.util.resetApiState().type);
    }
  });

  it('D-C12: the summary line states sessions and total time, and no h1/h2 carries a digit', async () => {
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    expect(screen.getByTestId('proposal-summary')).toHaveTextContent(
      '1 session · about 1 h this week'
    );
    expect(proposalSummary(3, 150)).toBe('3 sessions · about 2 h 30 min this week');
    expect(proposalSummary(1, 45)).toBe('1 session · about 45 min this week');
    for (const h of screen
      .getAllByRole('heading')
      .filter((el) => ['H1', 'H2'].includes(el.tagName))) {
      expect(h.textContent).not.toMatch(/\d/);
    }
  });

  it('copy audit — ready, conflict, empty, error and rolled-over states carry no forbidden word', async () => {
    const user = userEvent.setup();
    // ready
    let view = renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    expectNoForbiddenWords(view.container);
    // conflict
    mockedConfirm.mockRejectedValueOnce({
      response: {
        data: {
          statusCode: 409,
          conflicts: [
            { sessionIndex: 0, date: '2026-10-30', startTime: '09:00', reason: 'OVERLAPS_CLASS' },
          ],
        },
      },
    } as never);
    await user.click(screen.getByRole('button', { name: /use this plan/i }));
    await waitFor(() => expect(screen.getByTestId('conflict-summary')).toBeInTheDocument());
    expectNoForbiddenWords(view.container);
    // rolled over
    mockedConfirm.mockRejectedValueOnce({
      response: { data: { error: 'WINDOW_ROLLED_OVER' } },
    } as never);
    await user.click(screen.getByRole('button', { name: /use this plan/i }));
    await waitFor(() =>
      expect(screen.getByText(/this proposal's week has ended/i)).toBeInTheDocument()
    );
    expectNoForbiddenWords(view.container);
    cleanup();
    // empty
    mockedPreview.mockResolvedValueOnce({
      ...catchUpPreviewFixture,
      days: catchUpPreviewFixture.days.map((d) => ({ ...d, sessions: [] })),
      missedSessions: [],
      lockedPreserved: 0,
      completedPreserved: 0,
      warnings: [],
    } as never);
    view = renderPreview();
    await waitFor(() => expect(screen.getByText('Nothing new to schedule')).toBeInTheDocument());
    expectNoForbiddenWords(view.container);
    cleanup();
    // error
    mockedPreview.mockRejectedValueOnce(new Error('boom'));
    view = renderPreview();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expectNoForbiddenWords(view.container);
  });
});

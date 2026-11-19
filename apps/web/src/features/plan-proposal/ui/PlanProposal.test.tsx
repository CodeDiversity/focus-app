import { createRequire } from 'node:module';
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
import { putStudyPreferences } from '@/entities/study-preferences/api/studyPreferencesApi';
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

vi.mock('@/entities/study-preferences/api/studyPreferencesApi', () => ({
  putStudyPreferences: vi.fn(),
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
const mockedPut = vi.mocked(putStudyPreferences);

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

    // Focus entered on the heading; Tab reaches the week first — EP17F moved
    // the decision buttons to the action bar at the end of the DOM, so the
    // focus order matches the visual order (heading → week → … → decision).
    const heading = screen.getByRole('heading', { name: /your proposed week/i, level: 1 });
    expect(document.activeElement).toBe(heading);
    await user.tab();
    expect(screen.getByRole('button', { name: /essay 09:00/i })).toHaveFocus();

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

    // The action bar's confirm responds to Enter (the decision is last).
    const confirmBtn = screen.getByRole('button', { name: /use this plan/i });
    confirmBtn.focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(mockedConfirm).toHaveBeenCalledTimes(1));
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

  it('renders four regions in the contract order: summary, week, risk, What else changed (EP17F-AC4, replaces D-C6)', async () => {
    mockedPreview.mockResolvedValue({
      ...catchUpPreviewFixture,
      calibration: [{ assignmentType: 'ESSAY', multiplier: 1.5, samples: 4 }],
    } as never);
    const { container } = renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    const markers = Array.from(
      container.querySelectorAll(
        '[data-testid="proposal-summary"], [data-testid="editable-week"], section[aria-label="Workload warnings"], [data-testid="calibration-note"], [data-testid="catch-up-preservation"], [aria-labelledby="proposal-moved-heading"]'
      )
    ).map(
      (el) =>
        el.getAttribute('data-testid') ??
        el.getAttribute('aria-label') ??
        el.getAttribute('aria-labelledby')
    );
    expect(markers).toEqual([
      'proposal-summary',
      'editable-week',
      'Workload warnings',
      'calibration-note',
      'catch-up-preservation',
      'proposal-moved-heading',
    ]);
    // The demoted regions live inside the one labelled disclosure (▲ D-F2),
    // expanded by default at md+ (the jsdom fallback is the desktop layout).
    const disclosure = screen.getByRole('button', { name: 'What else changed' });
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(disclosure.getAttribute('aria-controls') as string);
    expect(panel).toContainElement(screen.getByTestId('calibration-note'));
    expect(panel).toContainElement(screen.getByTestId('catch-up-preservation'));
    expect(panel).toContainElement(
      screen.getByRole('heading', { level: 2, name: 'Moved forward into this plan' })
    );
    // …and the risk region never does (workload warnings stay visible).
    expect(panel).not.toContainElement(
      container.querySelector('section[aria-label="Workload warnings"]')
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

describe('PlanProposal (EP17F, composition and decision affordances)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPreview.mockResolvedValue(catchUpPreviewFixture as never);
    mockedLock.mockResolvedValue({ id: 'ps-1', locked: false } as never);
  });

  it('exposes exactly one Use this plan and one Not now, and neither is in the page header (EP17F-AC1)', async () => {
    const { container } = renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    const confirms = screen.getAllByRole('button', { name: /use this plan/i });
    const declines = screen.getAllByRole('button', { name: /not now/i });
    expect(confirms).toHaveLength(1);
    expect(declines).toHaveLength(1);
    const bar = screen.getByTestId('proposal-action-bar');
    expect(bar).toContainElement(confirms[0]);
    expect(bar).toContainElement(declines[0]);
    // The header region carries no button at all.
    const header = container.querySelector('.mb-6.min-w-0');
    expect(header).toBeTruthy();
    expect(header?.querySelector('button')).toBeNull();
  });

  it('the action bar clears the mobile tab bar and the safe area; the section reserves bottom padding (EP17F-AC2)', async () => {
    const { container } = renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    const bar = screen.getByTestId('proposal-action-bar');
    expect(bar.className).toContain('fixed');
    expect(bar.className).toContain('bottom-[calc(3.5rem+env(safe-area-inset-bottom))]');
    expect(bar.className).toContain('md:bottom-0');
    expect(bar.className).toContain('pb-[env(safe-area-inset-bottom)]');
    expect(bar.className).toContain('z-20');
    // The proposal section reserves matching bottom padding (D-F5).
    expect(container.querySelector('section')?.className).toContain('pb-24');
  });

  it('the confirm is reachable from the editing area at every scroll position by structure (EP17F-AC1, V-17-5)', async () => {
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    // Fixed to the viewport: not inside the scrolled content regions.
    const bar = screen.getByTestId('proposal-action-bar');
    expect(screen.getByTestId('editable-week')).not.toContainElement(bar);
    expect(bar.className).toContain('fixed');
    // Position at 360×640 is asserted by EP17H's Playwright run (TR-E17-06).
  });

  it('the pacing sentence names the sessions, the time and the spread (EP17F-AC3)', async () => {
    mockedPreview.mockResolvedValue({
      ...catchUpPreviewFixture,
      pacing: {
        spreadPercent: 70,
        studyDays: ['2026-10-30', '2026-11-01', '2026-11-03'],
        perDayMinutes: { '2026-10-30': 60 },
      },
    } as never);
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    expect(screen.getByTestId('proposal-summary')).toHaveTextContent(
      '1 session · about 1 h this week · spread across 3 days'
    );
    // A paragraph, never a heading.
    expect(screen.getByTestId('proposal-summary').tagName).toBe('P');
    // Helper boundaries (D-F3).
    expect(proposalSummary(5, 240, 3)).toBe(
      '5 sessions · about 4 h this week · spread across 3 days'
    );
    expect(proposalSummary(2, 90, 1)).toBe('2 sessions · about 1 h 30 min this week · on 1 day');
  });

  it('a preview without a pacing block renders today’s sentence unchanged; an empty proposal renders no summary (EP17F-AC3)', async () => {
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    // No pacing in the fixture → the pre-EP17D sentence, byte-identical.
    expect(screen.getByTestId('proposal-summary')).toHaveTextContent(
      '1 session · about 1 h this week'
    );
    expect(proposalSummary(3, 150)).toBe('3 sessions · about 2 h 30 min this week');
    cleanup();
    mockedPreview.mockResolvedValue({
      ...catchUpPreviewFixture,
      days: catchUpPreviewFixture.days.map((d) => ({ ...d, sessions: [], targetMinutes: 0 })),
      pacing: { spreadPercent: 70, studyDays: [], perDayMinutes: {} },
    } as never);
    renderPreview();
    await waitFor(() => expect(screen.getByText('Nothing new to schedule')).toBeInTheDocument());
    expect(screen.queryByTestId('proposal-summary')).toBeNull();
  });

  it('What else changed is collapsed below md and every demoted region is reachable through it (EP17F-AC4, ▲ D-F7)', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false, // below md
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    try {
      mockedPreview.mockResolvedValue({
        ...catchUpPreviewFixture,
        calibration: [{ assignmentType: 'ESSAY', multiplier: 1.5, samples: 4 }],
      } as never);
      const user = userEvent.setup();
      renderPreview();
      await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
      const disclosure = screen.getByRole('button', { name: 'What else changed' });
      expect(disclosure).toHaveAttribute('aria-expanded', 'false');
      // ▲ D-F7 (a): the calibration note starts collapsed below md too.
      expect(screen.queryByTestId('calibration-note')).toBeNull();
      expect(screen.queryByTestId('catch-up-preservation')).toBeNull();
      // The risk region is NOT demoted — warnings stay visible (▲ D-F2).
      expect(
        screen.getByRole('heading', { level: 2, name: 'Workload warnings' })
      ).toBeInTheDocument();

      await user.click(disclosure);
      expect(screen.getByTestId('calibration-note')).toBeInTheDocument();
      expect(screen.getByTestId('catch-up-preservation')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 2, name: 'Moved forward into this plan' })
      ).toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('a 409 marks the conflicted sessions, renders the conflict summary once and keeps it outside the disclosure (EP17F-AC5)', async () => {
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
    await user.click(screen.getByRole('button', { name: /use this plan/i }));
    await waitFor(() => expect(screen.getByTestId('conflict-summary')).toBeInTheDocument());
    expect(screen.getAllByTestId('conflict-summary')).toHaveLength(1);
    // Always-visible risk region: no disclosure needs forcing open (retires
    // EP16K's AC3 rule) — the summary is not inside the disclosure panel.
    const disclosure = screen.getByRole('button', { name: 'What else changed' });
    const panel = document.getElementById(disclosure.getAttribute('aria-controls') as string);
    expect(panel).not.toContainElement(screen.getByTestId('conflict-summary'));
  });

  it('axe reports no violations at 1280px and at 360px (EP17F-AC6)', async () => {
    const axe = loadAxe();
    for (const width of [1280, 360]) {
      (window as { innerWidth: number }).innerWidth = width;
      window.dispatchEvent(new Event('resize'));
      const view = renderPreview();
      await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
      const results = await axe.run(view.container, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        rules: {
          // Needs real rendering (canvas); covered by the e2e axe pass.
          'color-contrast': { enabled: false },
        },
      });
      expect(
        results.violations.map((v) => `${width}px ${v.id}: ${v.nodes.map((n) => n.html).join()}`)
      ).toEqual([]);
      cleanup();
    }
  });
});

/**
 * EP17G — the plan-time pacing levers in their slot. The disclosure is
 * collapsed in jsdom (`useMediaQuery(MD_UP_QUERY, false)` with no
 * `matchMedia`), so each case opens it first — which is also the phone path.
 */
describe('PlanProposal pacing controls (EP17G)', () => {
  const pacedFixture = {
    ...catchUpPreviewFixture,
    pacing: {
      spreadPercent: 70,
      studyDays: ['2026-10-30', '2026-11-01', '2026-11-03'],
      perDayMinutes: { '2026-10-30': 60 },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedPreview.mockResolvedValue(pacedFixture as never);
    mockedPut.mockResolvedValue({} as never);
  });

  const openPace = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'Change the pace' }));
  };

  it('sits under the pacing sentence behind one "Change the pace" toggle (D-G3, D-G8)', async () => {
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());

    const toggle = screen.getByRole('button', { name: 'Change the pace' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('pacing-controls')).toBeNull();

    await openPace(user);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // Region 1 order: summary → the controls → the week.
    const html = document.body.innerHTML;
    expect(html.indexOf('data-testid="proposal-summary"')).toBeLessThan(
      html.indexOf('data-testid="pacing-controls"')
    );
    expect(html.indexOf('data-testid="pacing-controls"')).toBeLessThan(
      html.indexOf('data-testid="editable-week"')
    );
  });

  it('a preview without a pacing block renders no pacing toggle', async () => {
    mockedPreview.mockResolvedValue(catchUpPreviewFixture as never);
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Change the pace' })).toBeNull();
  });

  it('choosing a preset saves it and rebuilds the week in place, announced once (EP17G-AC1/AC2)', async () => {
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    await openPace(user);

    mockedPreview.mockResolvedValueOnce({
      ...pacedFixture,
      days: pacedFixture.days.map((d) =>
        d.date === '2026-10-30'
          ? {
              ...d,
              sessions: [{ ...d.sessions[0], assignmentTitle: 'Rebuilt essay' }],
            }
          : d
      ),
      pacing: { ...pacedFixture.pacing, spreadPercent: 100 },
    } as never);

    await user.click(screen.getByRole('radio', { name: 'Evenly spread' }));

    await waitFor(() => expect(mockedPut).toHaveBeenCalledWith({ spreadPercent: 100 }));
    await waitFor(() => expect(mockedPreview).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByTestId('editable-week')).toHaveTextContent('Rebuilt essay')
    );
    // One announcement, from the new pacing block.
    expect(
      screen
        .getAllByRole('status')
        .map((n) => n.textContent)
        .join(' ')
    ).toContain('New week ready — evenly spread, across 3 days.');
    // We never left the surface.
    expect(navigate).not.toHaveBeenCalled();
  });

  it('while the rebuild is in flight the section is aria-busy and Use this plan is disabled (EP17G-AC3)', async () => {
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    await openPace(user);

    let release!: () => void;
    mockedPreview.mockReturnValueOnce(
      new Promise((resolve) => (release = () => resolve(pacedFixture as never))) as never
    );

    await user.click(screen.getByRole('radio', { name: 'Evenly spread' }));

    const section = document.querySelector('section[aria-labelledby="plan-proposal-heading"]')!;
    await waitFor(() => expect(section).toHaveAttribute('aria-busy', 'true'));
    expect(screen.getByRole('button', { name: /use this plan/i })).toBeDisabled();

    release();
    await waitFor(() => expect(section).not.toHaveAttribute('aria-busy'));
    expect(screen.getByRole('button', { name: /use this plan/i })).toBeEnabled();
  });

  it('a failed rebuild leaves the previous proposal rendered and editable (EP17G-AC3)', async () => {
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    await openPace(user);

    mockedPreview.mockRejectedValueOnce(new Error('boom'));
    await user.click(screen.getByRole('radio', { name: 'Evenly spread' }));

    await waitFor(() =>
      expect(screen.getByTestId('pacing-error')).toHaveTextContent(
        "We saved your choice but couldn't rebuild the week. Your current plan is still here."
      )
    );
    // The plan is still here — and still editable.
    expect(screen.getByTestId('editable-week')).toHaveTextContent('Essay');
    expect(screen.queryByText(/We couldn’t build a plan proposal/)).toBeNull();
    await user.click(screen.getByRole('button', { name: /essay 09:00/i }));
    await user.click(screen.getByRole('button', { name: /move later/i }));
    await waitFor(() =>
      expect(screen.getByTestId('editable-week')).toHaveTextContent('09:15 – 10:15')
    );
  });

  it('the copy audit passes with the controls open and closed (EP17G-AC5, TR-E17-05)', async () => {
    const user = userEvent.setup();
    const { container } = renderPreview();
    await waitFor(() => expect(screen.getByTestId('editable-week')).toBeInTheDocument());
    expectNoForbiddenWords(container);
    await openPace(user);
    expectNoForbiddenWords(container);
  });
});

/**
 * axe-core ships with eslint-plugin-jsx-a11y (the e2e helper uses the same
 * copy) — no new dependency. Loaded through that package's resolver.
 */
function loadAxe(): {
  run: (
    ctx: Element,
    opts: unknown
  ) => Promise<{ violations: { id: string; nodes: { html: string }[] }[] }>;
} {
  const here = createRequire(import.meta.url);
  const fromPlugin = createRequire(here.resolve('eslint-plugin-jsx-a11y/package.json'));
  return fromPlugin('axe-core');
}

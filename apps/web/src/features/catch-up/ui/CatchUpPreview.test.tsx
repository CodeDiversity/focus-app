import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CatchUpPreview } from './CatchUpPreview';
import {
  previewCatchUp,
  confirmCatchUpPlan,
  setPlannedSessionLock,
} from '@/entities/study-plan/api/studyPlanApi';

vi.mock('@/entities/study-plan/api/studyPlanApi', () => ({
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
        },
      ],
    },
    ...Array.from({ length: 6 }, (_, i) => ({
      date: `2026-10-${31 + i}`,
      targetMinutes: 0,
      sessions: [],
    })),
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
};

/** The deep-link case: mount the view directly (no prior navigation). */
function renderPreview() {
  return render(
    <MemoryRouter>
      <CatchUpPreview />
    </MemoryRouter>
  );
}

describe('CatchUpPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPreview.mockResolvedValue(catchUpPreviewFixture as never);
    mockedLock.mockResolvedValue({ id: 'ps-1', locked: false } as never);
  });

  it('fetches the preview on mount and renders proposed sessions grouped by day', async () => {
    const { container } = renderPreview();
    await waitFor(() => expect(mockedPreview).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('plan-week')).toBeInTheDocument());
    // Grouped by day: the week grid with its day columns, and the editor row.
    expect(container.querySelectorAll('[data-testid="plan-week"] section')).toHaveLength(7);
    expect(screen.getByTestId('plan-session-editor')).toHaveTextContent('Essay');
    // The window line names the server-proposed window.
    expect(screen.getByText(/2026-10-30 – 2026-11-05 · America\/New_York/)).toBeInTheDocument();
  });

  it('editing a proposed session then confirming posts the exact four-field body', async () => {
    mockedConfirm.mockResolvedValue({} as never);
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('plan-session-editor')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /move later/i }));
    await waitFor(() =>
      expect(screen.getByTestId('plan-session-editor')).toHaveTextContent('09:15 – 10:15')
    );

    await user.click(screen.getByRole('button', { name: /use this plan/i }));
    await waitFor(() => expect(mockedConfirm).toHaveBeenCalledTimes(1));
    const [from, to, sessions] = mockedConfirm.mock.calls[0];
    expect(from).toBe('2026-10-30');
    expect(to).toBe('2026-11-05');
    expect(sessions).toEqual([
      { assignmentId: 'a-1', date: '2026-10-30', startTime: '09:15', endTime: '10:15' },
    ]);
    // Exactly the four fields — nothing else in each session object.
    expect(Object.keys(sessions[0]).sort()).toEqual([
      'assignmentId',
      'date',
      'endTime',
      'startTime',
    ]);
  });

  it("'Not now' makes no request and returns to plan health (EP13E D-E14)", async () => {
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('plan-session-editor')).toBeInTheDocument());

    const callsBefore = mockedPreview.mock.calls.length;
    await user.click(screen.getByRole('button', { name: /not now/i }));
    expect(mockedConfirm).not.toHaveBeenCalled();
    expect(mockedPreview).toHaveBeenCalledTimes(callsBefore);
    expect(navigate).toHaveBeenCalledWith('/plan/health');
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
    await waitFor(() => expect(screen.getByTestId('plan-session-editor')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /move later/i }));
    await user.click(screen.getByRole('button', { name: /use this plan/i }));

    await waitFor(() => expect(screen.getByTestId('conflict-summary')).toBeInTheDocument());
    expect(screen.getByTestId('conflict-summary')).toHaveTextContent(
      /some sessions clash with your calendar\. adjust them and try again:/i
    );
    expect(screen.getByTestId('conflict-summary')).toHaveTextContent(/overlaps a class/i);
    // The offending row is marked — and the student's edit survives.
    const row = screen.getByTestId('plan-session-editor').querySelector('article');
    expect(row?.className).toContain('border-danger');
    expect(row).toHaveTextContent('09:15 – 10:15');
  });

  it('WINDOW_ROLLED_OVER shows the banner and “Create new plan” re-runs the preview', async () => {
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
    await waitFor(() => expect(screen.getByTestId('plan-session-editor')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /use this plan/i }));
    await waitFor(() =>
      expect(screen.getByText(/the plan week has rolled over/i)).toBeInTheDocument()
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    // The proposal is gone — only the regeneration affordance remains.
    expect(screen.queryByTestId('plan-session-editor')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create new plan/i }));
    await waitFor(() => expect(mockedPreview).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId('plan-session-editor')).toBeInTheDocument());
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
    await waitFor(() => expect(screen.getByTestId('plan-session-editor')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /use this plan/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('to must be exactly six days after from')
    );
  });

  it('shows the skeleton with aria-busy while generating', () => {
    mockedPreview.mockReturnValue(new Promise(() => {}) as never);
    renderPreview();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByTestId('plan-session-editor')).not.toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /back to plan health/i })).toBeInTheDocument();
    expect(screen.queryByTestId('plan-session-editor')).not.toBeInTheDocument();
  });

  it('shows the danger card with “Try again” when the preview fetch fails', async () => {
    mockedPreview.mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(
      screen.getByText(/we couldn't build a catch-up plan\. try again\./i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(mockedPreview).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId('plan-session-editor')).toBeInTheDocument());
  });

  it('renders locked preview sessions as read-only cards, never as editor rows', async () => {
    const { getByTestId } = renderPreview();
    await waitFor(() => expect(getByTestId('plan-session-editor')).toBeInTheDocument());
    // The locked missed session is only in the preservation card…
    expect(screen.getByTestId('catch-up-preservation')).toHaveTextContent('Lab report');
    // …never in the editable list (proposed sessions are the only editable rows).
    expect(getByTestId('plan-session-editor')).not.toHaveTextContent('Lab report');
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
    expect(screen.getByTestId('plan-session-editor')).toBeInTheDocument();
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
    await waitFor(() => expect(screen.getByTestId('plan-session-editor')).toBeInTheDocument());

    // unlock the locked missed session (succeeds; the preservation list empties)
    await user.click(screen.getByRole('button', { name: /keep "lab report" locked/i }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /keep "lab report" locked/i })).toBeNull()
    );

    // a failing confirm shows only the new conflict — the unlock is not rolled back
    await user.click(screen.getByRole('button', { name: /use this plan/i }));
    await waitFor(() => expect(screen.getByTestId('conflict-summary')).toBeInTheDocument());
    expect(screen.getByTestId('conflict-summary')).toHaveTextContent(/overlaps a class/i);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Confirm rejected'));
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining('lock'));
    expect(screen.queryByRole('button', { name: /keep "lab report" locked/i })).toBeNull();
    expect(screen.getByTestId('plan-session-editor')).toBeInTheDocument();
  });

  it('is keyboard operable — Tab/Enter reach and operate every header/editor/toggle control', async () => {
    mockedConfirm.mockResolvedValue({} as never);
    const user = userEvent.setup();
    renderPreview();
    await waitFor(() => expect(screen.getByTestId('plan-session-editor')).toBeInTheDocument());

    // Focus entered on the heading; Tab reaches the header controls.
    const heading = screen.getByRole('heading', { name: /catch-up plan/i, level: 1 });
    expect(document.activeElement).toBe(heading);
    await user.tab();
    expect(screen.getByRole('button', { name: /use this plan/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /not now/i })).toHaveFocus();

    // Editor controls respond to Enter.
    const moveLater = screen.getByRole('button', { name: /move later/i });
    moveLater.focus();
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(screen.getByTestId('plan-session-editor')).toHaveTextContent('09:15 – 10:15')
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

  it('copy contains no blaming terms', async () => {
    const { container } = renderPreview();
    await waitFor(() => expect(screen.getByTestId('plan-session-editor')).toBeInTheDocument());
    const text = container.textContent ?? '';
    // D08-8: neutral/encouraging only — the summary names missed sessions,
    // this surface never shames.
    expect(text).not.toMatch(/you missed/i);
    expect(text).not.toMatch(/you(’'ve| have|'?ve)? failed/i);
    expect(text).not.toMatch(/you'(re| are) behind/i);
    expect(text).not.toMatch(/punitive/i);
    expect(text).not.toMatch(/shame/i);
  });
});

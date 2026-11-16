import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Providers } from '@/test/providers';
import { startSessionFromPlanned } from '@/entities/study-session/api/studySessionApi';
import type { TodayPlan, TodaySession } from '@/entities/study-plan/model/types';
import { TodayPlanCard } from './TodayPlanCard';

vi.mock('@/entities/study-session/api/studySessionApi', () => ({
  // EP13K: the momentum slice imports this client.
  getMomentum: vi.fn(),
  startSessionFromPlanned: vi.fn(),
}));

const mockedStart = vi.mocked(startSessionFromPlanned);

/**
 * EP13D — the dashboard's "Today's plan" card (TR-E13-04).
 *
 * Pinned here: the hero/rows/chip projection, the one-tap start flow and its
 * failure branches (409 open session → "Go to your session"; 409/404 stale →
 * the stale message + a host refetch), every state the ui-refiner settled
 * (loading, no plan, nothing left, error), the non-blaming copy rule (no
 * compliance percentage, none of the blame terms the EP08 tests pin) and the
 * keyboard/afforded-control obligations.
 */
const session = (overrides: Partial<TodaySession> = {}): TodaySession => ({
  id: 'ps-1',
  assignmentId: 'a-1',
  assignmentTitle: 'Problem set 3',
  date: '2026-11-14',
  startTime: '09:00',
  endTime: '10:00',
  durationMinutes: 60,
  status: 'SCHEDULED',
  locked: false,
  // EP13H: the anchor travels with every today session.
  anchor: 'FIXED',
  windowHint: null,
  ...overrides,
});

const plan = (overrides: Partial<TodayPlan> = {}): TodayPlan => ({
  date: '2026-11-14',
  timeZone: 'UTC',
  sessions: [session()],
  nextSession: session(),
  nextSessionReason: null,
  confirmedMinutesToday: 0,
  ...overrides,
});

/** Shows the current route, so a navigation to /focus is observable. */
function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderCard(props: Partial<React.ComponentProps<typeof TodayPlanCard>> = {}) {
  const onRetry = props.onRetry ?? vi.fn();
  const utils = render(
    <Providers initialEntries={['/dashboard']}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <>
              <TodayPlanCard status="ready" plan={plan()} {...props} onRetry={onRetry} />
              <LocationProbe />
            </>
          }
        />
        <Route path="/focus" element={<LocationProbe />} />
      </Routes>
    </Providers>
  );
  return { ...utils, onRetry };
}

describe('TodayPlanCard (EP13D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStart.mockResolvedValue({ id: 'sess-1' } as never);
  });

  it('leads with the next session and offers one-tap start', async () => {
    renderCard();

    expect(screen.getByRole('heading', { level: 2, name: "Today's plan" })).toBeInTheDocument();
    expect(screen.getByText('Next up')).toBeInTheDocument();
    expect(screen.getByText('Problem set 3')).toBeInTheDocument();
    expect(screen.getByText('09:00 – 10:00 · 60 min')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start focus' })).toBeInTheDocument();
  });

  it('starts the planned session and lands the student on the focus page', async () => {
    renderCard();

    await userEvent.click(screen.getByRole('button', { name: 'Start focus' }));

    await waitFor(() => expect(mockedStart).toHaveBeenCalledWith('ps-1'));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/focus'));
  });

  it('an already-open session offers "Go to your session" instead of a dead end', async () => {
    mockedStart.mockRejectedValue({
      response: {
        status: 409,
        data: { statusCode: 409, message: 'A focus session is already in progress.' },
      },
      message: 'A focus session is already in progress.',
    });
    renderCard();

    await userEvent.click(screen.getByRole('button', { name: 'Start focus' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('A focus session is already in progress.');
    await userEvent.click(screen.getByRole('button', { name: 'Go to your session' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/focus'));
  });

  it('a stale session reports it plainly and asks the host to refetch', async () => {
    mockedStart.mockRejectedValue({
      response: { status: 404, data: { statusCode: 404, message: 'Resource not found' } },
      message: 'Resource not found',
    });
    const { onRetry } = renderCard();

    await userEvent.click(screen.getByRole('button', { name: 'Start focus' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "That session isn't on today's plan any more."
    );
    expect(onRetry).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Go to your session' })).not.toBeInTheDocument();
  });

  it('lists the rest of today with text status badges and their own start controls', async () => {
    renderCard({
      plan: plan({
        sessions: [
          session(),
          session({ id: 'ps-2', assignmentTitle: 'Lab report', status: 'COMPLETED' }),
          session({ id: 'ps-3', assignmentTitle: 'Essay', status: 'IN_PROGRESS' }),
        ],
        confirmedMinutesToday: 45,
      }),
    });

    expect(screen.getByText('45 min studied today')).toBeInTheDocument();
    // Status is conveyed as text, never colour alone.
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    // A finished session has no start control; a running one offers Resume.
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();
  });

  it('offers a way forward when there is no plan for today', async () => {
    renderCard({
      plan: plan({ sessions: [], nextSession: null, nextSessionReason: 'NO_PLAN' }),
    });

    expect(screen.getByText('No plan for today yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate a plan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Generate a plan' })).toHaveAttribute('href', '/plan');
  });

  it('celebrates a finished day without grading the student', async () => {
    renderCard({
      plan: plan({
        sessions: [session({ status: 'COMPLETED' })],
        nextSession: null,
        nextSessionReason: 'NOTHING_LEFT_TODAY',
        confirmedMinutesToday: 50,
      }),
    });

    expect(screen.getByText("Today's plan is done")).toBeInTheDocument();
    expect(
      screen.getByText('50 minutes studied today. Anything else is a bonus.')
    ).toBeInTheDocument();
  });

  it('renders the loading and error states with a retry', async () => {
    const { unmount } = renderCard({ status: 'loading', plan: undefined });
    expect(screen.getByRole('region', { name: "Today's plan" })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    unmount();

    // A server message is surfaced verbatim (DoD 4), like every sibling
    // dashboard section…
    const onRetry = vi.fn();
    const withMessage = renderCard({
      status: 'error',
      plan: undefined,
      error: new Error('Plan service unavailable'),
      onRetry,
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Plan service unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    withMessage.unmount();

    // …and a message-less failure falls back to the card's own copy.
    renderCard({ status: 'error', plan: undefined, error: {}, onRetry: vi.fn() });
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load today's plan.");
  });

  it('never reports plan compliance and never blames (D13-9)', async () => {
    const { container } = renderCard({
      plan: plan({ sessions: [session(), session({ id: 'ps-2', status: 'RESCHEDULED' })] }),
    });

    const text = container.textContent ?? '';
    expect(text).not.toMatch(/%/);
    expect(text).not.toMatch(/you missed/i);
    expect(text).not.toMatch(/behind/i);
    expect(text).not.toMatch(/failed/i);
    // A rolled-forward row reads as movement, not failure.
    expect(screen.getByText('Moved forward')).toBeInTheDocument();
  });

  it('is operable with the keyboard alone', async () => {
    renderCard();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Start focus' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(mockedStart).toHaveBeenCalledWith('ps-1'));
  });

  // ===================== EP13H — flex sessions on the card =====================

  it('a flex hero reads "Anytime today", never its suggested slot (D-H8)', () => {
    const flex = session({ anchor: 'FLEX_DAY', windowHint: 'EVENING' });
    renderCard({ plan: plan({ sessions: [flex], nextSession: flex }) });

    expect(screen.getByText('Anytime today · 60 min · evening suggested')).toBeInTheDocument();
    expect(screen.queryByText(/9:00/)).not.toBeInTheDocument();
    // The start affordance is unchanged — flex is startable like anything.
    expect(screen.getByRole('button', { name: 'Start focus' })).toBeInTheDocument();
  });

  it('a flex row in the rest-of-today list reads "Anytime today" with a working Start (D-H8)', async () => {
    const fixedNext = session();
    const flexRow = session({
      id: 'ps-2',
      assignmentTitle: 'Essay',
      anchor: 'FLEX_DAY',
      windowHint: null,
      startTime: '19:00',
      endTime: '20:00',
    });
    mockedStart.mockResolvedValue({ id: 'ss-1' } as never);
    const user = userEvent.setup();
    renderCard({ plan: plan({ sessions: [fixedNext, flexRow], nextSession: fixedNext }) });

    expect(screen.getByText('Anytime today · 60 min')).toBeInTheDocument();
    expect(screen.queryByText(/7:00/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start' }));
    await waitFor(() => expect(mockedStart).toHaveBeenCalledWith('ps-2'));
  });

  it('fixed sessions keep their clock range (EP13D behaviour unchanged)', () => {
    renderCard({ plan: plan() });
    // The hero still shows the time range for a fixed next session.
    expect(screen.getByText(/9:00/)).toBeInTheDocument();
    expect(screen.queryByText(/Anytime/)).not.toBeInTheDocument();
  });

  // ===================== EP13I — the micro-start (D-I1/D-I2) =====================

  it('the hero offers "Just 10 min" and starts the planned session with a 10-minute target', async () => {
    mockedStart.mockResolvedValue({ id: 'ss-1' } as never);
    const user = userEvent.setup();
    renderCard({ plan: plan() });

    const micro = screen.getByRole('button', {
      name: 'Just 10 min of Problem set 3',
    });
    await user.click(micro);
    await waitFor(() => expect(mockedStart).toHaveBeenCalledWith('ps-1', { plannedMinutes: 10 }));
  });

  it('the full start posts no body — EP13D behaviour unchanged by the micro affordance', async () => {
    mockedStart.mockResolvedValue({ id: 'ss-1' } as never);
    const user = userEvent.setup();
    renderCard({ plan: plan() });

    await user.click(screen.getByRole('button', { name: 'Start focus' }));
    await waitFor(() => expect(mockedStart).toHaveBeenCalledWith('ps-1'));
  });

  it('no micro affordance on a session already in progress — resuming is not starting', () => {
    const inProgress = session({ status: 'IN_PROGRESS' });
    renderCard({ plan: plan({ sessions: [inProgress], nextSession: inProgress }) });

    expect(screen.getByRole('button', { name: 'Resume focus' })).toBeInTheDocument();
    expect(screen.queryByText('Just 10 min')).not.toBeInTheDocument();
  });
});

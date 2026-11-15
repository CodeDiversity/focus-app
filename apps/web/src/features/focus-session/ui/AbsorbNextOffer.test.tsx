import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Providers } from '@/test/providers';
import { AbsorbNextOffer } from './AbsorbNextOffer';
import { absorbNextSession } from '@/entities/study-session/api/studySessionApi';
import { getTodayPlan } from '@/entities/study-plan/api/studyPlanApi';
import type { StudySession } from '@/entities/study-session/model/types';
import type { TodayPlan, TodaySession } from '@/entities/study-plan/model/types';

vi.mock('@/entities/study-session/api/studySessionApi', () => ({
  absorbNextSession: vi.fn(),
}));

vi.mock('@/entities/study-plan/api/studyPlanApi', () => ({
  getTodayPlan: vi.fn(),
  getRecoverySummary: vi.fn(),
}));

const mockedAbsorb = vi.mocked(absorbNextSession);
const mockedToday = vi.mocked(getTodayPlan);

/**
 * EP13I — the absorption offer (TR-E13-10, D-I6/D-I9): the gating matrix
 * (target × ACTIVE × candidate × declined), the accept flow updating the
 * target in place, the quiet 409 dismissal, the no-call decline, the copy
 * rule (positive, no overrun language) and the `role="status"` announcement.
 */
const session = (overrides: Partial<StudySession> = {}): StudySession =>
  ({
    id: 'ss-1',
    assignmentId: 'a-1',
    taskId: null,
    plannedSessionId: 'ps-linked',
    startTime: '2026-11-14T09:00:00.000Z',
    endTime: null,
    status: 'ACTIVE',
    elapsedSeconds: 1500,
    durationMinutes: 0,
    plannedMinutes: 25,
    notes: null,
    isFocusMode: true,
    rating: null,
    ...overrides,
  }) as StudySession;

const todaySession = (overrides: Partial<TodaySession> = {}): TodaySession => ({
  id: 'ps-next',
  assignmentId: 'a-1',
  assignmentTitle: 'Essay',
  date: '2026-11-14',
  startTime: '19:00',
  endTime: '20:00',
  durationMinutes: 60,
  status: 'SCHEDULED',
  locked: false,
  anchor: 'FLEX_DAY',
  windowHint: 'EVENING',
  ...overrides,
});

const todayPlan = (sessions: TodaySession[]): TodayPlan => ({
  date: '2026-11-14',
  timeZone: 'UTC',
  sessions,
  nextSession: sessions[0] ?? null,
  nextSessionReason: sessions.length ? null : 'NOTHING_LEFT_TODAY',
  confirmedMinutesToday: 0,
});

function renderOffer(props: Partial<React.ComponentProps<typeof AbsorbNextOffer>> = {}) {
  const onApply = props.onApply ?? vi.fn();
  render(
    <Providers initialEntries={['/focus']}>
      <AbsorbNextOffer
        session={props.session ?? session()}
        targetReached={props.targetReached ?? true}
        onApply={onApply}
      />
    </Providers>
  );
  return { onApply };
}

describe('AbsorbNextOffer (EP13I)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedToday.mockResolvedValue(todayPlan([todaySession()]));
  });

  it('offers to fold in the candidate, as a persistent role="status" card — never a toast', async () => {
    renderOffer();

    const offer = await screen.findByTestId('absorb-next-offer');
    expect(offer).toHaveAttribute('role', 'status');
    expect(offer).toHaveTextContent('Still going — fold in the next Essay session?');
    expect(screen.getByRole('button', { name: 'Keep going (+60 min)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No thanks' })).toBeInTheDocument();
    // Positive framing only (AC-4, D13-9).
    expect(offer.textContent).not.toMatch(/exceed|overrun|over target|late/i);
  });

  it('accepting grows the target in place and refetches today', async () => {
    const grown = session({ plannedMinutes: 85 });
    mockedAbsorb.mockResolvedValue(grown);
    const user = userEvent.setup();
    const { onApply } = renderOffer();

    await user.click(await screen.findByRole('button', { name: 'Keep going (+60 min)' }));

    await waitFor(() => expect(mockedAbsorb).toHaveBeenCalledWith('ss-1'));
    expect(onApply).toHaveBeenCalledWith(grown);
    // The candidate read ran again after the absorb (the row is COMPLETED now).
    await waitFor(() => expect(mockedToday.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('declining makes no call and the same candidate is not re-offered (D-I6)', async () => {
    const user = userEvent.setup();
    renderOffer();

    await user.click(await screen.findByRole('button', { name: 'No thanks' }));

    expect(mockedAbsorb).not.toHaveBeenCalled();
    expect(screen.queryByTestId('absorb-next-offer')).not.toBeInTheDocument();
  });

  it('a lost race (409) dismisses quietly — no error wall for someone who is working', async () => {
    mockedAbsorb.mockRejectedValue({ response: { status: 409 }, message: 'gone' });
    const user = userEvent.setup();
    renderOffer();

    await user.click(await screen.findByRole('button', { name: 'Keep going (+60 min)' }));

    await waitFor(() => expect(screen.queryByTestId('absorb-next-offer')).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('gating: hidden before the target, when not ACTIVE, and without a qualifying candidate', async () => {
    // Before the target.
    const { unmount: u1 } = render(
      <Providers initialEntries={['/focus']}>
        <AbsorbNextOffer session={session()} targetReached={false} onApply={vi.fn()} />
      </Providers>
    );
    expect(screen.queryByTestId('absorb-next-offer')).not.toBeInTheDocument();
    u1();

    // Paused.
    const { unmount: u2 } = render(
      <Providers initialEntries={['/focus']}>
        <AbsorbNextOffer session={session({ status: 'PAUSED' })} targetReached onApply={vi.fn()} />
      </Providers>
    );
    expect(screen.queryByTestId('absorb-next-offer')).not.toBeInTheDocument();
    u2();

    // No candidate: the only SCHEDULED row belongs to another assignment, and
    // the session's own linked row never counts.
    mockedToday.mockResolvedValue(
      todayPlan([
        todaySession({ id: 'ps-other', assignmentId: 'a-2' }),
        todaySession({ id: 'ps-linked', status: 'IN_PROGRESS' }),
      ])
    );
    render(
      <Providers initialEntries={['/focus']}>
        <AbsorbNextOffer session={session()} targetReached onApply={vi.fn()} />
      </Providers>
    );
    await waitFor(() => expect(mockedToday).toHaveBeenCalled());
    expect(screen.queryByTestId('absorb-next-offer')).not.toBeInTheDocument();
  });

  it('is keyboard operable: both actions are reachable buttons', async () => {
    renderOffer();
    const accept = await screen.findByRole('button', { name: 'Keep going (+60 min)' });
    const decline = screen.getByRole('button', { name: 'No thanks' });
    accept.focus();
    expect(accept).toHaveFocus();
    decline.focus();
    expect(decline).toHaveFocus();
  });
});

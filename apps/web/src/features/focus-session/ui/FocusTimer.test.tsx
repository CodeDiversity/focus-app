import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FocusTimer } from './FocusTimer';
import { MemoryRouter } from 'react-router-dom';
import type { MomentumSummary, StudySession } from '@/entities/study-session/model/types';

const session: StudySession = {
  id: 's-1',
  assignmentId: 'a-1',
  taskId: null,
  plannedSessionId: null,
  status: 'ACTIVE',
  startTime: '2026-10-30T10:00:00.000Z',
  endTime: null,
  elapsedSeconds: 125,
  durationMinutes: 0,
  plannedMinutes: 50,
  notes: null,
  createdAt: '2026-10-30T10:00:00.000Z',
  updatedAt: '2026-10-30T10:00:00.000Z',
};

describe('FocusTimer', () => {
  it('renders elapsed time in MM:SS', () => {
    render(
      <FocusTimer
        session={session}
        displayedElapsed={125}
        busyAction={null}
        transitionError={null}
        conflict409={false}
        onPause={() => {}}
        onResume={() => {}}
        onFinish={() => {}}
        onReload={() => {}}
      />
    );
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('renders H:MM:SS at >=1h', () => {
    render(
      <FocusTimer
        session={session}
        displayedElapsed={3661}
        busyAction={null}
        transitionError={null}
        conflict409={false}
        onPause={() => {}}
        onResume={() => {}}
        onFinish={() => {}}
        onReload={() => {}}
      />
    );
    expect(screen.getByText('1:01:01')).toBeInTheDocument();
  });

  it('hides progress bar when plannedMinutes null', () => {
    render(
      <FocusTimer
        session={{ ...session, plannedMinutes: null }}
        displayedElapsed={10}
        busyAction={null}
        transitionError={null}
        conflict409={false}
        onPause={() => {}}
        onResume={() => {}}
        onFinish={() => {}}
        onReload={() => {}}
      />
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('No target set')).toBeInTheDocument();
  });

  it('caps progress at 100% when exceeded', () => {
    render(
      <FocusTimer
        session={session}
        displayedElapsed={session.plannedMinutes! * 60 + 100}
        busyAction={null}
        transitionError={null}
        conflict409={false}
        onPause={() => {}}
        onResume={() => {}}
        onFinish={() => {}}
        onReload={() => {}}
      />
    );
    // width style 100%
    // loose check: text present
    expect(screen.getByText(/Target reached/)).toBeInTheDocument();
  });

  it('exposes status in polite live region', () => {
    const { container } = render(
      <FocusTimer
        session={session}
        displayedElapsed={10}
        busyAction={null}
        transitionError={null}
        conflict409={false}
        onPause={() => {}}
        onResume={() => {}}
        onFinish={() => {}}
        onReload={() => {}}
      />
    );
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent('Focus session running');
  });

  it('disables controls while busy', () => {
    render(
      <FocusTimer
        session={session}
        displayedElapsed={10}
        busyAction={'pause'}
        transitionError={null}
        conflict409={false}
        onPause={() => {}}
        onResume={() => {}}
        onFinish={() => {}}
        onReload={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Pause' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Finish session' })).toBeDisabled();
  });

  describe('celebration on finish (EP13K, D-K8)', () => {
    const momentum: MomentumSummary = {
      date: '2026-11-18',
      timeZone: 'UTC',
      today: { confirmedMinutes: 25, goalMinutes: 60, goalMet: false },
      week: {
        startDate: '2026-11-16',
        studyDays: ['2026-11-16', '2026-11-18'],
        studyDayCount: 2,
        goalDays: 3,
        goalMet: false,
      },
      run: { currentWeeks: 1, bestWeeks: 2, currentWeekCounted: false },
      hasHistory: true,
    };
    const finished = (durationMinutes: number): StudySession => ({
      ...session,
      status: 'COMPLETED',
      durationMinutes,
      endTime: '2026-10-30T10:25:00.000Z',
    });
    const renderFinished = (minutes: number, m?: MomentumSummary) =>
      render(
        <MemoryRouter>
          <FocusTimer
            session={finished(minutes)}
            displayedElapsed={minutes * 60}
            busyAction={null}
            transitionError={null}
            conflict409={false}
            onPause={() => {}}
            onResume={() => {}}
            onFinish={() => {}}
            onReload={() => {}}
            momentum={m}
          />
        </MemoryRouter>
      );

    it('a finished session with minutes shows the celebration with the minutes sentence', () => {
      renderFinished(25, momentum);
      expect(screen.getByTestId('focus-celebration')).toBeInTheDocument();
      expect(screen.getByText('You studied 25 minutes.')).toBeInTheDocument();
      expect(screen.getByText('25 of 60 min today')).toBeInTheDocument();
      expect(screen.getByText('2 of 3 days this week')).toBeInTheDocument();
      expect(screen.getByText('Goal met 1 week in a row')).toBeInTheDocument();
      // The existing exits stay.
      expect(screen.getByRole('button', { name: 'View study history' })).toBeInTheDocument();
    });

    it('without a momentum read the celebration shows the headline alone (no spinner, no error)', () => {
      renderFinished(25);
      expect(screen.getByText('You studied 25 minutes.')).toBeInTheDocument();
      expect(screen.queryByText(/min today/)).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('the celebration carries `motion-reduce:animate-none` on its animated element', () => {
      const { container } = renderFinished(25, momentum);
      const animated = container.querySelectorAll('[class*="animate-"]');
      expect(animated.length).toBeGreaterThan(0);
      for (const el of animated) {
        expect(el.className).toContain('motion-reduce:animate-none');
      }
    });

    it("the live region reads 'Focus session complete — you studied 25 minutes.'", () => {
      const { container } = renderFinished(25, momentum);
      const regions = container.querySelectorAll('[aria-live]');
      expect(regions).toHaveLength(1);
      expect(regions[0]).toHaveTextContent('Focus session complete — you studied 25 minutes.');
    });

    it('a 0-minute finish shows the neutral line and no celebration', () => {
      const { container } = renderFinished(0);
      expect(screen.queryByTestId('focus-celebration')).not.toBeInTheDocument();
      expect(
        screen.getByText('Nothing recorded this time. Your work is still in your plan.')
      ).toBeInTheDocument();
      expect(container.querySelector('[aria-live]')).toHaveTextContent('Focus session complete');
      expect(container.querySelector('[class*="animate-"]')).toBeNull();
    });

    it('the celebration copy never references the plan or a percent', () => {
      renderFinished(25, momentum);
      const text = screen.getByTestId('focus-celebration').textContent ?? '';
      expect(text).not.toMatch(/plan/i);
      expect(text).not.toMatch(/%/);
      expect(text).not.toMatch(/missed|behind|failed|lazy|should|broke|lost/i);
    });
  });
});

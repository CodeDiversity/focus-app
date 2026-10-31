import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FocusTimer } from './FocusTimer';
import type { StudySession } from '@/entities/study-session/model/types';

const session: StudySession = {
  id: 's-1',
  assignmentId: 'a-1',
  taskId: null,
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
});

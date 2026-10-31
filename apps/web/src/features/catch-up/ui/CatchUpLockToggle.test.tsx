import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatchUpLockToggle } from './CatchUpLockToggle';
import { setPlannedSessionLock } from '@/entities/study-plan/api/studyPlanApi';

vi.mock('@/entities/study-plan/api/studyPlanApi', () => ({
  setPlannedSessionLock: vi.fn(),
}));

const mocked = vi.mocked(setPlannedSessionLock);

describe('CatchUpLockToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = (locked = true, onLockedChange = vi.fn()) => {
    render(
      <CatchUpLockToggle
        sessionId="ps-1"
        assignmentTitle="Essay"
        locked={locked}
        onLockedChange={onLockedChange}
      />
    );
    return { onLockedChange };
  };

  const toggle = () => screen.getByRole('button', { name: /keep "essay" locked/i });

  it('fires setPlannedSessionLock(sessionId, nextLocked) on click', async () => {
    mocked.mockResolvedValue({ id: 'ps-1', locked: false });
    setup();
    const user = userEvent.setup();
    await user.click(toggle());
    await waitFor(() => expect(mocked).toHaveBeenCalledWith('ps-1', false));
  });

  it('success updates aria-pressed and reports the change for the ±1 count', async () => {
    mocked.mockResolvedValue({ id: 'ps-1', locked: false });
    const { onLockedChange } = setup(true);
    const user = userEvent.setup();
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    await user.click(toggle());
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-pressed', 'false'));
    expect(onLockedChange).toHaveBeenCalledWith('ps-1', false);
  });

  it('failure reverts the toggle and shows the inline alert; clicking again retries', async () => {
    mocked.mockRejectedValueOnce(new Error('boom'));
    setup();
    const user = userEvent.setup();
    await user.click(toggle());
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent(
      /we couldn't update that session's lock\. try again\./i
    );
    // Reverted: still pressed (locked).
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');

    mocked.mockResolvedValue({ id: 'ps-1', locked: false });
    await user.click(toggle());
    await waitFor(() => expect(mocked).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-pressed', 'false'));
  });

  it('is disabled and busy while pending', () => {
    mocked.mockReturnValue(new Promise(() => {}) as never);
    setup();
    fireEvent.click(toggle());
    expect(toggle()).toBeDisabled();
    expect(toggle()).toHaveAttribute('aria-busy', 'true');
  });

  it('announces the outcome through an sr-only live status', async () => {
    mocked.mockResolvedValue({ id: 'ps-1', locked: false });
    setup();
    const user = userEvent.setup();
    await user.click(toggle());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Lock saved'));
  });
});

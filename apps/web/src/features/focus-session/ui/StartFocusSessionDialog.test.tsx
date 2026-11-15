import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Providers } from '@/test/providers';
import { StartFocusSessionDialog } from './StartFocusSessionDialog';
import { startStudySession } from '@/entities/study-session/api/studySessionApi';

vi.mock('@/entities/study-session/api/studySessionApi', () => ({
  startStudySession: vi.fn(),
}));

const mockedStart = vi.mocked(startStudySession);

/**
 * EP13I (D-I5) — the dialog's micro-start: an exit from deciding. One click
 * starts immediately with a 10-minute target; the presets and the custom
 * duration flow are untouched.
 */
const assignment = {
  id: 'a-1',
  title: 'Essay',
  dueDate: null,
  estimatedHours: null,
};

function renderDialog() {
  return render(
    <Providers initialEntries={['/assignments']}>
      <StartFocusSessionDialog assignment={assignment} open onClose={vi.fn()} />
    </Providers>
  );
}

describe('StartFocusSessionDialog — micro-start (EP13I)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('"Just 10 minutes" starts immediately with a 10-minute target, bypassing the form', async () => {
    mockedStart.mockResolvedValue({ id: 'ss-1' } as never);
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Start for just 10 minutes' }));

    await waitFor(() =>
      expect(mockedStart).toHaveBeenCalledWith({ assignmentId: 'a-1', plannedMinutes: 10 })
    );
  });

  it('the normal start flow is unchanged — the default duration posts as before', async () => {
    mockedStart.mockResolvedValue({ id: 'ss-1' } as never);
    const user = userEvent.setup();
    renderDialog();

    // No stored preferences in the test store → the 25-minute fallback.
    await user.click(screen.getByRole('button', { name: 'Start focus session' }));

    await waitFor(() =>
      expect(mockedStart).toHaveBeenCalledWith({ assignmentId: 'a-1', plannedMinutes: 25 })
    );
  });
});

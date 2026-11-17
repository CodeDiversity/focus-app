import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BANNER_DISMISSED_KEY, DayBoundsBanner } from './DayBoundsBanner';

const defaults = {
  configured: false,
  days: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    wakeTime: '08:00',
    sleepTime: '23:00',
  })),
};

describe('DayBoundsBanner (EP15F-AC1)', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('shows the one-line nudge with the current defaults only while configured is false', () => {
    const { rerender } = render(<DayBoundsBanner bounds={defaults} onOpen={vi.fn()} />);
    expect(screen.getByTestId('day-bounds-banner')).toHaveTextContent(
      'Your days run 08:00–23:00 for now. When does your day usually start and end? Set it'
    );
    expect(screen.queryByRole('dialog')).toBeNull(); // never a modal
    rerender(<DayBoundsBanner bounds={{ ...defaults, configured: true }} onOpen={vi.fn()} />);
    expect(screen.queryByTestId('day-bounds-banner')).toBeNull();
    rerender(<DayBoundsBanner bounds={null} onOpen={vi.fn()} />);
    expect(screen.queryByTestId('day-bounds-banner')).toBeNull();
  });

  it('"Set it" opens; Dismiss hides it for the session (sessionStorage) and it reappears in a new session', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const { unmount } = render(<DayBoundsBanner bounds={defaults} onOpen={onOpen} />);
    await user.click(screen.getByRole('button', { name: 'Set it' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByTestId('day-bounds-banner')).toBeNull();
    expect(window.sessionStorage.getItem(BANNER_DISMISSED_KEY)).toBe('1');
    unmount();
    render(<DayBoundsBanner bounds={defaults} onOpen={onOpen} />);
    expect(screen.queryByTestId('day-bounds-banner')).toBeNull(); // same session
    window.sessionStorage.clear(); // a new session
    render(<DayBoundsBanner bounds={defaults} onOpen={onOpen} />);
    expect(screen.getByTestId('day-bounds-banner')).toBeInTheDocument();
  });

  it('controls are ≥ 44 px on narrow screens', () => {
    render(<DayBoundsBanner bounds={defaults} onOpen={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Set it' }).className).toMatch(
      /max-sm:min-h-\[44px\]/
    );
    expect(screen.getByRole('button', { name: 'Dismiss' }).className).toMatch(/max-sm:h-11/);
  });
});

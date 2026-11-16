import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MomentumSummary } from '@/entities/study-session/model/types';
import { MomentumCard } from './MomentumCard';

const momentum: MomentumSummary = {
  date: '2026-11-18',
  timeZone: 'UTC',
  today: { confirmedMinutes: 45, goalMinutes: 60, goalMet: false },
  week: {
    startDate: '2026-11-16',
    studyDays: ['2026-11-16', '2026-11-18'],
    studyDayCount: 2,
    goalDays: 3,
    goalMet: false,
  },
  run: { currentWeeks: 0, bestWeeks: 0, currentWeekCounted: false },
  hasHistory: true,
};

const BLAME = /missed|behind|failed|lazy|should|broke|lost/i;

const renderCard = (props: Partial<Parameters<typeof MomentumCard>[0]> = {}) =>
  render(<MomentumCard momentum={momentum} status="ready" onRetry={() => {}} {...props} />);

describe('MomentumCard (EP13K)', () => {
  it('shows minutes today in its own units and fills the bar without rendering a percent', () => {
    const { container } = renderCard();
    expect(screen.getByRole('heading', { level: 2, name: 'Your momentum' })).toBeInTheDocument();
    expect(screen.getByText('45 of 60 min today')).toBeInTheDocument();
    const bar = screen.getByTestId('momentum-daily-bar');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('75%');
    expect(container.textContent).not.toMatch(/%/);
  });

  it('shows the seven day marks with text labels and the days-this-week line', () => {
    renderCard();
    const strip = screen.getByTestId('momentum-week-strip');
    const cells = strip.querySelectorAll('li');
    expect(cells).toHaveLength(7);
    expect([...cells].map((c) => c.textContent)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);
    expect([...cells].map((c) => c.getAttribute('data-studied'))).toEqual([
      'true',
      'false',
      'true',
      'false',
      'false',
      'false',
      'false',
    ]);
    expect(screen.getByText('2 of 3 days this week')).toBeInTheDocument();
    expect(screen.getByText('Studied on Monday and Wednesday.')).toHaveClass('sr-only');
  });

  it('goal met reads the met copy, never a grade', () => {
    renderCard({
      momentum: {
        ...momentum,
        today: { confirmedMinutes: 75, goalMinutes: 60, goalMet: true },
        week: { ...momentum.week, studyDayCount: 3, goalMet: true },
      },
    });
    expect(screen.getByText('Daily goal met — 75 min today')).toBeInTheDocument();
    expect(screen.getByText('Weekly goal met — 3 days')).toBeInTheDocument();
  });

  it('a quiet week shows the best run and the fresh-start line (D-K10)', () => {
    renderCard({
      momentum: { ...momentum, run: { currentWeeks: 0, bestWeeks: 4, currentWeekCounted: false } },
    });
    expect(
      screen.getByText('Best run so far: 4 weeks. This week is a fresh start.')
    ).toBeInTheDocument();
  });

  it("run ≥ 1 reads 'Goal met {w} weeks in a row'", () => {
    renderCard({
      momentum: { ...momentum, run: { currentWeeks: 3, bestWeeks: 5, currentWeekCounted: true } },
    });
    expect(screen.getByText('Goal met 3 weeks in a row')).toBeInTheDocument();
  });

  it('empty state before any session offers no second start control', () => {
    renderCard({ momentum: { ...momentum, hasHistory: false } });
    expect(screen.getByText('No sessions yet')).toBeInTheDocument();
    expect(screen.getByText(/Your first focus session starts your momentum/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders the loading and error states with a retry', async () => {
    const { rerender } = renderCard({ status: 'loading', momentum: undefined });
    expect(screen.getByRole('region', { name: 'Your momentum' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    const onRetry = vi.fn();
    rerender(<MomentumCard status="error" error={undefined} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load your momentum.");
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('never renders a `%` or a blame term (D13-9)', () => {
    const variants: MomentumSummary[] = [
      momentum,
      { ...momentum, today: { confirmedMinutes: 0, goalMinutes: 60, goalMet: false } },
      { ...momentum, run: { currentWeeks: 0, bestWeeks: 2, currentWeekCounted: false } },
      { ...momentum, hasHistory: false },
    ];
    for (const v of variants) {
      const { container, unmount } = renderCard({ momentum: v });
      expect(container.textContent).not.toMatch(/\d\s*%/);
      expect(container.textContent).not.toMatch(BLAME);
      unmount();
    }
  });

  it('the bar is `aria-hidden` and the text carries the meaning (non-colour-only)', () => {
    renderCard();
    expect(screen.getByTestId('momentum-daily-bar')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('momentum-week-strip')).toHaveAttribute('aria-hidden', 'true');
  });

  it('stacks under `sm` and keeps 44px targets', () => {
    renderCard();
    const body = screen.getByTestId('momentum-daily-bar').closest('.flex-col');
    expect(body).toHaveClass('flex-col', 'sm:flex-row');
    for (const cell of screen.getByTestId('momentum-week-strip').querySelectorAll('li')) {
      expect(cell).toHaveClass('min-h-[44px]');
    }
  });
});

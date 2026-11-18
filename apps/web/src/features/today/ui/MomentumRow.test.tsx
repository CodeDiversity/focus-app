import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MomentumRow } from './MomentumRow';
import { runLine, weeklyLine } from '@/features/momentum/model/momentumCopy';
import type { MomentumSummary } from '@/entities/study-session/model/types';
import { expectNoForbiddenWords } from '@/test/forbiddenWords';

const base: MomentumSummary = {
  date: '2026-05-06',
  timeZone: 'UTC',
  today: { confirmedMinutes: 25, goalMinutes: 60, goalMet: false },
  week: {
    startDate: '2026-05-04',
    days: [
      '2026-05-04',
      '2026-05-05',
      '2026-05-06',
      '2026-05-07',
      '2026-05-08',
      '2026-05-09',
      '2026-05-10',
    ],
    studyDays: ['2026-05-04', '2026-05-06'],
    studyDayCount: 2,
    goalDays: 3,
    goalMet: false,
  },
  run: { currentWeeks: 1, bestWeeks: 2, currentWeekCounted: false },
  hasHistory: true,
};

const renderRow = (props: Partial<Parameters<typeof MomentumRow>[0]> = {}) =>
  render(
    <MemoryRouter>
      <MomentumRow momentum={base} status="ready" onRetry={() => undefined} {...props} />
    </MemoryRouter>
  );

describe('MomentumRow (EP16B-AC2, TR-E16-06)', () => {
  it('parity: the sentence equals weeklyLine(fixture) and runLine(fixture)', () => {
    renderRow();
    expect(screen.getByText(weeklyLine(base))).toBeInTheDocument();
    expect(screen.getByText(runLine(base) as string)).toBeInTheDocument();
  });

  it('parity: nothing extra when runLine is null', () => {
    const quiet = { ...base, run: { currentWeeks: 0, bestWeeks: 0, currentWeekCounted: false } };
    renderRow({ momentum: quiet });
    expect(runLine(quiet)).toBeNull();
    expect(screen.getByTestId('momentum-row').querySelectorAll('p')).toHaveLength(2); // sentence + sr-only strip sentence
  });

  it('goal met shows the met sentence; text carries the meaning, the icon is decorative', () => {
    const met = { ...base, week: { ...base.week, studyDayCount: 3, goalMet: true } };
    renderRow({ momentum: met });
    const sentence = screen.getByText('Weekly goal met — 3 days');
    expect(sentence.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the compact week strip aria-hidden with its sr-only sentence', () => {
    renderRow();
    const strip = screen.getByTestId('momentum-week-strip');
    expect(strip).toHaveAttribute('aria-hidden', 'true');
    expect(strip.querySelector('li')?.className).toContain('min-h-[36px]');
    expect(screen.getByText('Studied on Monday and Wednesday.')).toHaveClass('sr-only');
  });

  it('has no progress bar, no daily sentence and no visible heading', () => {
    renderRow();
    expect(screen.queryByTestId('momentum-daily-bar')).toBeNull();
    expect(screen.queryByText(/min today/)).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Your momentum' })).toHaveClass('sr-only');
  });

  it('"See history" links to /focus/history', () => {
    renderRow();
    expect(screen.getByRole('link', { name: 'See history' })).toHaveAttribute(
      'href',
      '/focus/history'
    );
  });

  it('renders nothing when !hasHistory', () => {
    const { container } = renderRow({ momentum: { ...base, hasHistory: false } });
    expect(container).toBeEmptyDOMElement();
  });

  it('loading renders one aria-busy skeleton line', () => {
    const { container } = renderRow({ status: 'loading', momentum: undefined });
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByTestId('momentum-row')).toBeNull();
  });

  it('error renders "We couldn\'t load your momentum." and Try again calls onRetry', async () => {
    const onRetry = vi.fn();
    renderRow({ status: 'error', momentum: undefined, onRetry });
    expect(screen.getByText("We couldn't load your momentum.")).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders no % and no forbidden word', () => {
    const { container } = renderRow();
    expectNoForbiddenWords(container);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PacingControls } from './PacingControls';
import { expectNoForbiddenWords } from '@/test/forbiddenWords';
import { putStudyPreferences } from '@/entities/study-preferences/api/studyPreferencesApi';
import type { PlanPacing } from '@/entities/study-plan/model/types';

vi.mock('@/entities/study-preferences/api/studyPreferencesApi', () => ({
  putStudyPreferences: vi.fn(),
}));

const mockedPut = vi.mocked(putStudyPreferences);

const pacing: PlanPacing = {
  spreadPercent: 70,
  studyDays: ['2026-11-19', '2026-11-20', '2026-11-21'],
  perDayMinutes: { '2026-11-19': 60, '2026-11-20': 60, '2026-11-21': 0 },
};

const spreadGroup = () => screen.getByRole('group', { name: 'How your week is paced' });
const daysGroup = () => screen.getByRole('group', { name: 'Study days a week' });

function renderControls(overrides: Partial<Parameters<typeof PacingControls>[0]> = {}) {
  const onChanged = overrides.onChanged ?? vi.fn().mockResolvedValue({ ok: true, pacing });
  const result = render(
    <PacingControls pacing={overrides.pacing ?? pacing} onChanged={onChanged} {...overrides} />
  );
  return { ...result, onChanged };
}

describe('PacingControls (EP17G)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPut.mockResolvedValue({} as never);
  });

  it('both groups reflect the effective values from the pacing block on first render (EP17G-AC1)', () => {
    renderControls();
    expect(within(spreadGroup()).getByRole('radio', { name: 'A little each day' })).toBeChecked();
    // `studyDays.length` is the day count (contracts §5, ▲ D-D1).
    expect(within(daysGroup()).getByRole('radio', { name: 'Steady' })).toBeChecked();
  });

  it('an off-preset stored spread renders the Custom option pre-selected (EP13N D-N2)', () => {
    renderControls({ pacing: { ...pacing, spreadPercent: 42 } });
    const custom = within(spreadGroup()).getByRole('radio', { name: 'Custom' });
    expect(custom).toBeChecked();
    expect(spreadGroup().textContent).not.toMatch(/%/);
  });

  it('an off-preset day count renders an honest Custom day option (EP13N D-N2)', () => {
    renderControls({
      pacing: { ...pacing, studyDays: ['a', 'b', 'c', 'd'] },
    });
    expect(within(daysGroup()).getByRole('radio', { name: 'Custom (4 days)' })).toBeChecked();
  });

  it('the explanatory sentence is present before any change is made (EP17G-AC2)', () => {
    renderControls();
    expect(
      screen.getByText(
        /Choosing one saves it for next time and builds this week again from scratch/i
      )
    ).toBeInTheDocument();
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it('the study-days group states that the number steers the planner (▲ D17-2 proviso, ▲ D17-16)', () => {
    renderControls();
    expect(daysGroup()).toHaveTextContent(
      "Your plan uses at most this many days of the week, and it's the number of days you're aiming to show up."
    );
  });

  it('choosing a spread preset PUTs only spreadPercent then re-previews once (EP17G-AC1)', async () => {
    const user = userEvent.setup();
    const { onChanged } = renderControls();

    await user.click(within(spreadGroup()).getByRole('radio', { name: 'Evenly spread' }));

    await waitFor(() => expect(mockedPut).toHaveBeenCalledTimes(1));
    expect(mockedPut).toHaveBeenCalledWith({ spreadPercent: 100 });
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });

  it('choosing a study-days option PUTs only weeklyGoalDays (EP17G-AC1)', async () => {
    const user = userEvent.setup();
    const { onChanged } = renderControls();

    await user.click(within(daysGroup()).getByRole('radio', { name: 'Most days' }));

    await waitFor(() => expect(mockedPut).toHaveBeenCalledWith({ weeklyGoalDays: 5 }));
    expect(mockedPut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });

  it('the announcement fires once per change, not once per render (EP17G-AC2)', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn().mockResolvedValue({
      ok: true,
      pacing: { ...pacing, spreadPercent: 100, studyDays: ['a', 'b', 'c'] },
    });
    const { rerender } = renderControls({ onChanged });

    expect(screen.getByRole('status')).toHaveTextContent('');
    await user.click(within(spreadGroup()).getByRole('radio', { name: 'Evenly spread' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'New week ready — evenly spread, across 3 days.'
      )
    );

    // A re-render with the settled payload does not re-announce.
    rerender(<PacingControls pacing={{ ...pacing, spreadPercent: 100 }} onChanged={onChanged} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'New week ready — evenly spread, across 3 days.'
    );
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('a one-day week reads "across 1 day" (EP17G-AC2 boundary)', async () => {
    const user = userEvent.setup();
    const onChanged = vi
      .fn()
      .mockResolvedValue({ ok: true, pacing: { ...pacing, studyDays: ['a'] } });
    renderControls({ onChanged });
    await user.click(within(spreadGroup()).getByRole('radio', { name: 'As early as possible' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'New week ready — as early as possible, across 1 day.'
      )
    );
  });

  it('a failed PUT does not re-preview, keeps the previous selection and offers Try again (EP17G-AC3)', async () => {
    const user = userEvent.setup();
    mockedPut.mockRejectedValue(new Error('boom'));
    const { onChanged } = renderControls();

    await user.click(within(spreadGroup()).getByRole('radio', { name: 'Evenly spread' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("We couldn't save that choice. Try again.");
    expect(onChanged).not.toHaveBeenCalled();
    // The previous selection stands.
    expect(within(spreadGroup()).getByRole('radio', { name: 'A little each day' })).toBeChecked();
    expect(within(spreadGroup()).getByRole('radio', { name: 'Evenly spread' })).not.toBeChecked();

    // Try again retries the whole change.
    mockedPut.mockResolvedValue({} as never);
    await user.click(within(alert).getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(mockedPut).toHaveBeenLastCalledWith({ spreadPercent: 100 });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a failed rebuild shows the reassuring error and retries only the rebuild (EP17G-AC3)', async () => {
    const user = userEvent.setup();
    const onChanged = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, pacing });
    renderControls({ onChanged });

    await user.click(within(spreadGroup()).getByRole('radio', { name: 'Evenly spread' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      "We saved your choice but couldn't rebuild the week. Your current plan is still here."
    );
    // The write succeeded, so the new choice is shown.
    expect(within(spreadGroup()).getByRole('radio', { name: 'Evenly spread' })).toBeChecked();

    await user.click(within(alert).getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(onChanged).toHaveBeenCalledTimes(2);
    // No second write — only the rebuild was retried.
    expect(mockedPut).toHaveBeenCalledTimes(1);
  });

  it('both groups are disabled while a change is in flight (EP17G-AC3)', async () => {
    const user = userEvent.setup();
    let release!: () => void;
    mockedPut.mockImplementation(
      () => new Promise((resolve) => (release = () => resolve({} as never)))
    );
    renderControls();

    await user.click(within(spreadGroup()).getByRole('radio', { name: 'Evenly spread' }));
    await waitFor(() =>
      expect(within(spreadGroup()).getByRole('radio', { name: 'Evenly spread' })).toBeDisabled()
    );
    for (const radio of within(daysGroup()).getAllByRole('radio')) expect(radio).toBeDisabled();

    release();
    await waitFor(() =>
      expect(within(daysGroup()).getByRole('radio', { name: 'Steady' })).toBeEnabled()
    );
  });

  it('the `disabled` prop disables every control (confirm in flight)', () => {
    renderControls({ disabled: true });
    for (const radio of within(spreadGroup()).getAllByRole('radio')) expect(radio).toBeDisabled();
    for (const radio of within(daysGroup()).getAllByRole('radio')) expect(radio).toBeDisabled();
  });

  it('every string passes the copy audit, including the `%` check (EP17G-AC5)', async () => {
    const user = userEvent.setup();
    const { container } = renderControls({ pacing: { ...pacing, spreadPercent: 42 } });
    expectNoForbiddenWords(container);
    await user.click(within(daysGroup()).getByRole('radio', { name: 'Light' }));
    await waitFor(() => expect(screen.getByRole('status')).not.toHaveTextContent(''));
    expectNoForbiddenWords(container);
  });
});

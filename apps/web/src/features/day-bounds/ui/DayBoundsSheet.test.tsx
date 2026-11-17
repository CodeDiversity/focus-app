import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DayBoundsSheet, validatePair } from './DayBoundsSheet';
import { putDayBounds } from '@/entities/day-bounds/api/dayBoundsApi';

vi.mock('@/entities/day-bounds/api/dayBoundsApi', () => ({ putDayBounds: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
const mockedPut = vi.mocked(putDayBounds);

const seven = (wakeTime: string, sleepTime: string) =>
  [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, wakeTime, sleepTime }));
const defaults = { configured: false, days: seven('08:00', '23:00') };
const varied = {
  configured: true,
  days: seven('07:30', '23:00').map((d) =>
    d.dayOfWeek === 0 || d.dayOfWeek === 6 ? { ...d, wakeTime: '09:00' } : d
  ),
};

const setTime = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('DayBoundsSheet (EP15F-AC2/AC3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens with "Same every day" on and one pair pre-filled from the current values (D-F3)', () => {
    render(<DayBoundsSheet bounds={defaults} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(
      screen.getByRole('dialog', { name: 'When does your day start and end?' })
    ).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Same every day' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByLabelText('Day starts')).toHaveValue('08:00');
    expect(screen.getByLabelText('Day ends')).toHaveValue('23:00');
    expect(screen.queryByText('Monday')).toBeNull();
  });

  it('switching off reveals seven rows, Monday first, pre-filled; differing stored bounds open in that mode', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <DayBoundsSheet bounds={defaults} onClose={vi.fn()} onSaved={vi.fn()} />
    );
    await user.click(screen.getByRole('switch', { name: 'Same every day' }));
    const legends = screen.getAllByRole('group').map((g) => g.querySelector('legend')?.textContent);
    expect(legends).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]);
    expect(screen.getByLabelText('Wednesday starts')).toHaveValue('08:00');
    unmount();
    render(<DayBoundsSheet bounds={varied} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole('switch', { name: 'Same every day' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.getByLabelText('Sunday starts')).toHaveValue('09:00');
    expect(screen.getByLabelText('Monday starts')).toHaveValue('07:30');
  });

  it('"same every day" expands one pair to seven identical entries; 00:00 as the end travels as 24:00 (R-EP15-11)', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    mockedPut.mockResolvedValue({ configured: true, days: seven('07:00', '24:00') });
    render(<DayBoundsSheet bounds={defaults} onClose={vi.fn()} onSaved={onSaved} />);
    setTime('Day starts', '07:00');
    setTime('Day ends', '00:00');
    expect(screen.getByText('00:00 means midnight', { exact: false })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mockedPut).toHaveBeenCalledWith(seven('07:00', '24:00')));
    expect(onSaved).toHaveBeenCalledWith({ configured: true, days: seven('07:00', '24:00') });
  });

  it('a stored 24:00 re-opens as 00:00 (R-EP15-11)', () => {
    render(
      <DayBoundsSheet
        bounds={{ configured: true, days: seven('07:00', '24:00') }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Day ends')).toHaveValue('00:00');
  });

  it('per-day mode sends the seven rows as edited', async () => {
    const user = userEvent.setup();
    mockedPut.mockResolvedValue({ configured: true, days: varied.days });
    render(<DayBoundsSheet bounds={varied} onClose={vi.fn()} onSaved={vi.fn()} />);
    setTime('Saturday ends', '00:00');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mockedPut).toHaveBeenCalledTimes(1));
    const sent = mockedPut.mock.calls[0][0];
    expect(sent).toHaveLength(7);
    expect(sent.find((d) => d.dayOfWeek === 6)).toEqual({
      dayOfWeek: 6,
      wakeTime: '09:00',
      sleepTime: '24:00',
    });
    expect(sent.find((d) => d.dayOfWeek === 1)).toEqual({
      dayOfWeek: 1,
      wakeTime: '07:30',
      sleepTime: '23:00',
    });
  });

  it('client validation mirrors the API and runs after the midnight mapping; nothing is sent when invalid', async () => {
    const user = userEvent.setup();
    render(<DayBoundsSheet bounds={defaults} onClose={vi.fn()} onSaved={vi.fn()} />);
    setTime('Day starts', '22:00');
    setTime('Day ends', '21:00');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('End time must be after the start time')).toBeInTheDocument();
    expect(mockedPut).not.toHaveBeenCalled();
    // 00:00 as the end means midnight — never "before the start".
    setTime('Day ends', '00:00');
    expect(validatePair({ wakeTime: '22:00', sleepTime: '00:00' })).toEqual({});
    expect(validatePair({ wakeTime: '', sleepTime: '23:00' }).wakeTime).toBe(
      'Enter a start time (HH:mm)'
    );
    expect(validatePair({ wakeTime: '08:00', sleepTime: '' }).sleepTime).toBe(
      'Enter an end time (HH:mm)'
    );
  });

  it('a 400 maps days[i].field errors onto the matching field (single or per-day); "days" errors are form-level', async () => {
    const user = userEvent.setup();
    const reject = (errors: Record<string, string[]>) =>
      Object.assign(new Error('Request failed'), {
        response: {
          data: {
            statusCode: 400,
            message: Object.values(errors).flat(),
            error: 'Bad Request',
            errors,
          },
        },
      });
    mockedPut.mockRejectedValueOnce(
      reject({ 'days[3].sleepTime': ['days[3].sleepTime must be strictly after days[3].wakeTime'] })
    );
    const { unmount } = render(
      <DayBoundsSheet bounds={defaults} onClose={vi.fn()} onSaved={vi.fn()} />
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText('days[3].sleepTime must be strictly after days[3].wakeTime')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Day ends')).toHaveAttribute('aria-invalid', 'true');
    unmount();
    mockedPut.mockRejectedValueOnce(
      reject({ 'days[6].wakeTime': ['bad'], days: ['days must hold each weekday exactly once'] })
    );
    render(<DayBoundsSheet bounds={varied} onClose={vi.fn()} onSaved={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('bad')).toBeInTheDocument();
    expect(screen.getByLabelText('Saturday starts')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('days must hold each weekday exactly once');
  });

  it('Escape and Cancel close without a request; the dialog is the shared Dialog with a focus trap', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DayBoundsSheet bounds={defaults} onClose={onClose} onSaved={vi.fn()} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(mockedPut).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    for (const name of ['Save', 'Cancel']) {
      expect(within(dialog).getByRole('button', { name }).className).toMatch(
        /max-sm:min-h-\[44px\]/
      );
    }
    expect(screen.getByLabelText('Day starts')).toHaveAttribute('type', 'time');
  });
});

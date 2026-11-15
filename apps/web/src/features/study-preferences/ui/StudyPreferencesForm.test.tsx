import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import { StudyPreferencesForm } from './StudyPreferencesForm';
import {
  getStudyPreferences,
  putStudyPreferences,
} from '@/entities/study-preferences/api/studyPreferencesApi';
import type { StudyPreferences } from '@/entities/study-preferences/model/types';

vi.mock('@/entities/study-preferences/api/studyPreferencesApi', () => ({
  getStudyPreferences: vi.fn(),
  putStudyPreferences: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockedGet = vi.mocked(getStudyPreferences);
const mockedPut = vi.mocked(putStudyPreferences);
const mockedToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

const stored: StudyPreferences = {
  sessionLengthMinutes: 45,
  minSessionMinutes: 10,
  maxSessionMinutes: 90,
  dailyCapMinutes: 180,
  // EP13F (D13-5): the two placement levers.
  breakMinutes: 10,
  densityPercent: 70,
};

const defaults: StudyPreferences = {
  sessionLengthMinutes: 60,
  minSessionMinutes: 15,
  maxSessionMinutes: 120,
  dailyCapMinutes: 240,
  breakMinutes: 15,
  densityPercent: 80,
};

const setupUser = () => userEvent.setup();

beforeEach(() => {
  vi.clearAllMocks();
  mockedGet.mockResolvedValue(stored);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('StudyPreferencesForm loading state', () => {
  it('shows a spinner card before the GET resolves and does not render default values prematurely', async () => {
    let resolveGet: (v: StudyPreferences) => void = () => undefined;
    mockedGet.mockImplementation(
      () =>
        new Promise<StudyPreferences>((resolve) => {
          resolveGet = resolve;
        })
    );

    render(<StudyPreferencesForm />);

    expect(screen.getByText('Loading study preferences…')).toBeInTheDocument();
    // No form inputs yet.
    expect(screen.queryByLabelText(/default session length/i)).not.toBeInTheDocument();

    // Resolve and ensure the form then appears.
    await (async () => {
      resolveGet(stored);
    })();
    await waitFor(() =>
      expect(screen.getByLabelText(/default session length/i)).toBeInTheDocument()
    );
  });

  it('re-runs the GET when "Try again" is clicked after a read failure', async () => {
    const user = setupUser();
    mockedGet.mockRejectedValueOnce(new Error('Network down'));
    mockedGet.mockResolvedValueOnce(stored);

    render(<StudyPreferencesForm />);

    expect(
      await screen.findByText('We could not load your study preferences. Try again.')
    ).toBeInTheDocument();
    const tryAgain = screen.getByRole('button', { name: 'Try again' });
    await user.click(tryAgain);

    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByLabelText(/default session length/i)).toHaveValue(45));
  });
});

describe('StudyPreferencesForm pre-fill', () => {
  it('pre-fills the four values from the API response', async () => {
    render(<StudyPreferencesForm />);
    await waitFor(() => expect(screen.getByLabelText(/default session length/i)).toHaveValue(45));
    expect(screen.getByLabelText(/shortest session/i)).toHaveValue(10);
    expect(screen.getByLabelText(/longest session/i)).toHaveValue(90);
    expect(screen.getByLabelText(/daily cap/i)).toHaveValue(180);
  });

  it('shows the API defaults when the response carries them', async () => {
    mockedGet.mockResolvedValue(defaults);
    render(<StudyPreferencesForm />);
    await waitFor(() => expect(screen.getByLabelText(/default session length/i)).toHaveValue(60));
    expect(screen.getByLabelText(/shortest session/i)).toHaveValue(15);
    expect(screen.getByLabelText(/longest session/i)).toHaveValue(120);
    expect(screen.getByLabelText(/daily cap/i)).toHaveValue(240);
  });
});

describe('StudyPreferencesForm placement levers (EP13F, D13-5; EP13N, D13-15)', () => {
  const BLAME_TERMS = /missed|behind|failed|fail|lazy|wrong|should|%/i;

  const leverFieldset = () => screen.getByRole('group', { name: 'How your days are filled' });
  const densityGroup = () => screen.getByRole('group', { name: 'Fill level' });
  const radio = (name: string | RegExp) => screen.getByRole('radio', { name });
  const cardOf = (input: HTMLElement) => input.closest('label') as HTMLElement;

  it('renders the break field seeded from the stored value with its label and hint', async () => {
    render(<StudyPreferencesForm />);
    await waitFor(() =>
      expect(screen.getByLabelText('Break between sessions (minutes)')).toBeInTheDocument()
    );
    expect(screen.getByLabelText('Break between sessions (minutes)')).toHaveValue(10);
    expect(screen.getByText('0–60')).toBeInTheDocument();
  });

  // EP13N-AC1
  it('renders the density lever as a labelled radio group of exactly Relaxed / Balanced / Packed for a preset value', async () => {
    mockedGet.mockResolvedValue(defaults); // densityPercent 80
    render(<StudyPreferencesForm />);
    await waitFor(() => expect(densityGroup()).toBeInTheDocument());

    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.getAttribute('aria-labelledby'))).toHaveLength(3);
    expect(radio('Relaxed')).not.toBeChecked();
    expect(radio('Balanced')).toBeChecked();
    expect(radio('Packed')).not.toBeChecked();
    expect(screen.queryByRole('radio', { name: /custom/i })).not.toBeInTheDocument();
    // No numeric density input survives.
    expect(screen.queryByLabelText(/fill up to/i)).not.toBeInTheDocument();
  });

  it('gives every named option a plain-language description and never a bare percentage as its primary label', async () => {
    mockedGet.mockResolvedValue(defaults);
    render(<StudyPreferencesForm />);
    await waitFor(() => expect(densityGroup()).toBeInTheDocument());

    for (const r of screen.getAllByRole('radio')) {
      const name = r.getAttribute('aria-labelledby')!;
      expect(document.getElementById(name)!.textContent).not.toMatch(/%|\d/);
      const desc = r.getAttribute('aria-describedby')!;
      expect(document.getElementById(desc)!.textContent!.length).toBeGreaterThan(10);
    }
    expect(radio('Relaxed')).toHaveAccessibleDescription(
      'Plenty of breathing room — about 60% of your free time.'
    );
    expect(radio('Balanced')).toHaveAccessibleDescription('Steady but not crowded — about 80%.');
    expect(radio('Packed')).toHaveAccessibleDescription('Use nearly all your free time — 100%.');
  });

  // EP13N-AC2
  it.each([
    ['Relaxed', 60],
    ['Balanced', 80],
    ['Packed', 100],
  ])('selecting %s and saving writes %i and the response re-selects it', async (name, value) => {
    const user = setupUser();
    mockedPut.mockResolvedValue({ ...stored, densityPercent: value });

    render(<StudyPreferencesForm />);
    await waitFor(() => expect(densityGroup()).toBeInTheDocument());

    await user.click(radio(name));
    expect(radio(name)).toBeChecked();
    await user.click(screen.getByRole('button', { name: /save study preferences/i }));

    await waitFor(() => expect(mockedPut).toHaveBeenCalled());
    expect(mockedPut.mock.calls[0][0]).toMatchObject({ breakMinutes: 10, densityPercent: value });
    expect(typeof mockedPut.mock.calls[0][0].densityPercent).toBe('number');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Study preferences saved.')
    );
    expect(radio(name)).toBeChecked();
  });

  it('sends the break field with the chosen preset', async () => {
    const user = setupUser();
    mockedPut.mockResolvedValue({ ...stored, breakMinutes: 5, densityPercent: 100 });

    render(<StudyPreferencesForm />);
    await waitFor(() => expect(densityGroup()).toBeInTheDocument());

    const breakInput = screen.getByLabelText(/break between sessions/i);
    await user.clear(breakInput);
    await user.type(breakInput, '5');
    await user.click(radio('Packed'));
    await user.click(screen.getByRole('button', { name: /save study preferences/i }));

    await waitFor(() => expect(mockedPut).toHaveBeenCalled());
    expect(mockedPut.mock.calls[0][0]).toMatchObject({ breakMinutes: 5, densityPercent: 100 });
  });

  // EP13N-AC1 + AC2 (D-N2): honest Custom option
  it('renders a stored non-preset value as a pre-selected "Custom (n%)" option and keeps it when saving untouched', async () => {
    const user = setupUser();
    mockedPut.mockResolvedValue(stored); // densityPercent 70

    render(<StudyPreferencesForm />);
    await waitFor(() => expect(densityGroup()).toBeInTheDocument());

    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(radio('Custom (70%)')).toBeChecked();
    expect(radio('Balanced')).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: /save study preferences/i }));
    await waitFor(() => expect(mockedPut).toHaveBeenCalled());
    expect(mockedPut.mock.calls[0][0]).toMatchObject({ densityPercent: 70 });
    // Still custom after the round-trip.
    await waitFor(() => expect(radio('Custom (70%)')).toBeChecked());
  });

  it('drops the Custom option once a preset is saved', async () => {
    const user = setupUser();
    mockedPut.mockResolvedValue({ ...stored, densityPercent: 80 });

    render(<StudyPreferencesForm />);
    await waitFor(() => expect(densityGroup()).toBeInTheDocument());
    expect(radio('Custom (70%)')).toBeChecked();

    await user.click(radio('Balanced'));
    // Not saved yet: the custom option is still offered so the student can go back.
    expect(radio('Custom (70%)')).toBeInTheDocument();
    expect(radio('Custom (70%)')).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: /save study preferences/i }));
    await waitFor(() => expect(mockedPut).toHaveBeenCalled());
    expect(mockedPut.mock.calls[0][0]).toMatchObject({ densityPercent: 80 });

    await waitFor(() => expect(radio('Balanced')).toBeChecked());
    expect(screen.queryByRole('radio', { name: /custom/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  // EP13N-AC3
  it('is keyboard operable: Tab reaches the checked radio and arrow keys move the selection', async () => {
    const user = setupUser();
    mockedGet.mockResolvedValue(defaults);
    render(<StudyPreferencesForm />);
    await waitFor(() => expect(densityGroup()).toBeInTheDocument());

    screen.getByLabelText(/break between sessions/i).focus();
    await user.tab();
    expect(radio('Balanced')).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(radio('Packed')).toHaveFocus();
    expect(radio('Packed')).toBeChecked();
    expect(radio('Balanced')).not.toBeChecked();

    await user.keyboard('{ArrowLeft}');
    await user.keyboard('{ArrowLeft}');
    expect(radio('Relaxed')).toHaveFocus();
    expect(radio('Relaxed')).toBeChecked();
  });

  it('marks the selected card by border, check icon and text — never colour alone — and carries the focus-ring utilities', async () => {
    const user = setupUser();
    mockedGet.mockResolvedValue(defaults);
    render(<StudyPreferencesForm />);
    await waitFor(() => expect(densityGroup()).toBeInTheDocument());

    const selected = cardOf(radio('Balanced'));
    const unselected = cardOf(radio('Relaxed'));
    expect(selected.className).toContain('border-accent');
    expect(selected.querySelector('[data-icon="selected"]')).not.toBeNull();
    expect(selected).toHaveTextContent('Selected');
    expect(unselected.className).not.toContain('border-accent');
    expect(unselected.querySelector('[data-icon="selected"]')).toBeNull();
    expect(unselected).not.toHaveTextContent('Selected');
    expect(selected.className).toContain('focus-within:ring-focus-ring');

    await user.click(radio('Relaxed'));
    expect(cardOf(radio('Relaxed'))).toHaveTextContent('Selected');
    expect(cardOf(radio('Balanced'))).not.toHaveTextContent('Selected');
  });

  // EP13N-AC4
  it('keeps the break field numeric with the 0–60 bounds message', async () => {
    const user = setupUser();
    render(<StudyPreferencesForm />);
    await waitFor(() => expect(densityGroup()).toBeInTheDocument());

    const breakInput = screen.getByLabelText(/break between sessions/i);
    expect(breakInput).toHaveAttribute('type', 'number');
    expect(breakInput).toHaveAttribute('min', '0');
    expect(breakInput).toHaveAttribute('max', '60');
    await user.clear(breakInput);
    await user.type(breakInput, '61');
    await user.click(screen.getByRole('button', { name: /save study preferences/i }));
    expect(await screen.findByText('Must be between 0 and 60.')).toBeInTheDocument();
    expect(mockedPut).not.toHaveBeenCalled();

    await user.clear(breakInput);
    await user.type(breakInput, '0');
    mockedPut.mockResolvedValue({ ...stored, breakMinutes: 0 });
    await user.click(screen.getByRole('button', { name: /save study preferences/i }));
    await waitFor(() => expect(mockedPut).toHaveBeenCalled());
    expect(mockedPut.mock.calls[0][0]).toMatchObject({ breakMinutes: 0 });
  });

  it('explains both levers in prose that carries no percentages and no blame terms', async () => {
    render(<StudyPreferencesForm />);
    await waitFor(() => expect(leverFieldset()).toBeInTheDocument());

    const prose = Array.from(leverFieldset().querySelectorAll(':scope > p'))
      .map((p) => p.textContent ?? '')
      .join(' ');
    expect(prose.length).toBeGreaterThan(20);
    expect(prose).not.toMatch(BLAME_TERMS);
    expect(prose).toMatch(/break/i);
    expect(prose).toMatch(/fill/i);
    expect(leverFieldset().querySelector('legend')).toHaveTextContent('How your days are filled');
  });

  // EP13N-AC5: server-side density errors still land on the lever
  it('renders a 400 densityPercent error under the radio group', async () => {
    const user = setupUser();
    mockedPut.mockRejectedValue({
      response: {
        data: {
          statusCode: 400,
          message: ['densityPercent must be an integer between 50 and 100'],
          error: 'Bad Request',
          errors: { densityPercent: ['densityPercent must be an integer between 50 and 100'] },
        },
      },
      message: 'Request failed with status code 400',
    });

    render(<StudyPreferencesForm />);
    await waitFor(() => expect(densityGroup()).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /save study preferences/i }));

    const error = await screen.findByText('densityPercent must be an integer between 50 and 100');
    expect(densityGroup()).toContainElement(error);
    expect(mockedToast.error).not.toHaveBeenCalled();
  });
});

describe('StudyPreferencesForm validation', () => {
  it('blocks submit on an out-of-range value and names the field', async () => {
    const user = setupUser();
    render(<StudyPreferencesForm />);
    await waitFor(() =>
      expect(screen.getByLabelText(/default session length/i)).toBeInTheDocument()
    );

    const input = screen.getByLabelText(/default session length/i);
    await user.clear(input);
    await user.type(input, '600');
    await user.click(screen.getByRole('button', { name: /save study preferences/i }));

    expect(await screen.findByText('Must be between 5 and 480.')).toBeInTheDocument();
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it('blocks submit on a non-integer value', async () => {
    const user = setupUser();
    render(<StudyPreferencesForm />);
    await waitFor(() =>
      expect(screen.getByLabelText(/default session length/i)).toBeInTheDocument()
    );

    const input = screen.getByLabelText(/default session length/i);
    await user.clear(input);
    await user.type(input, '1.5');
    await user.click(screen.getByRole('button', { name: /save study preferences/i }));

    expect(await screen.findByText('Must be a whole number.')).toBeInTheDocument();
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it('blocks submit on a broken cross-field combination (min > sessionLength) naming minSessionMinutes', async () => {
    const user = setupUser();
    render(<StudyPreferencesForm />);
    await waitFor(() => expect(screen.getByLabelText(/shortest session/i)).toBeInTheDocument());

    const minInput = screen.getByLabelText(/shortest session/i);
    await user.clear(minInput);
    await user.type(minInput, '100');
    await user.click(screen.getByRole('button', { name: /save study preferences/i }));

    expect(
      await screen.findByText('Shortest session must be no longer than the default session length.')
    ).toBeInTheDocument();
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it('blocks submit when sessionLength > max naming maxSessionMinutes', async () => {
    const user = setupUser();
    render(<StudyPreferencesForm />);
    await waitFor(() => expect(screen.getByLabelText(/longest session/i)).toBeInTheDocument());

    // lower max below default session length 45
    const maxInput = screen.getByLabelText(/longest session/i);
    await user.clear(maxInput);
    await user.type(maxInput, '10');
    await user.click(screen.getByRole('button', { name: /save study preferences/i }));

    expect(
      await screen.findByText('Longest session must be at least the default session length.')
    ).toBeInTheDocument();
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it('blocks submit when dailyCap < min naming dailyCapMinutes', async () => {
    const user = setupUser();
    render(<StudyPreferencesForm />);
    await waitFor(() => expect(screen.getByLabelText(/daily cap/i)).toBeInTheDocument());

    const capInput = screen.getByLabelText(/daily cap/i);
    await user.clear(capInput);
    await user.type(capInput, '5');
    await user.click(screen.getByRole('button', { name: /save study preferences/i }));

    expect(
      await screen.findByText('Daily cap must be at least the shortest session.')
    ).toBeInTheDocument();
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it('blocks submit on an out-of-range daily cap', async () => {
    const user = setupUser();
    render(<StudyPreferencesForm />);
    await waitFor(() => expect(screen.getByLabelText(/daily cap/i)).toBeInTheDocument());

    const capInput = screen.getByLabelText(/daily cap/i);
    await user.clear(capInput);
    await user.type(capInput, '2000');
    await user.click(screen.getByRole('button', { name: /save study preferences/i }));

    expect(await screen.findByText('Must be between 5 and 1440.')).toBeInTheDocument();
    expect(mockedPut).not.toHaveBeenCalled();
  });
});

describe('StudyPreferencesForm save', () => {
  it('calls PUT with every value and announces success', async () => {
    const user = setupUser();
    const saved: StudyPreferences = { ...stored, sessionLengthMinutes: 30 };
    mockedPut.mockResolvedValue(saved);

    render(<StudyPreferencesForm />);
    await waitFor(() =>
      expect(screen.getByLabelText(/default session length/i)).toBeInTheDocument()
    );

    // change default session length to 30 (still within bounds and cross-field ok)
    const defInput = screen.getByLabelText(/default session length/i);
    await user.clear(defInput);
    await user.type(defInput, '30');
    await user.click(screen.getByRole('button', { name: /save study preferences/i }));

    await waitFor(() => expect(mockedPut).toHaveBeenCalled());
    const callArg = mockedPut.mock.calls[0][0];
    expect(callArg).toMatchObject({
      sessionLengthMinutes: 30,
      minSessionMinutes: 10,
      maxSessionMinutes: 90,
      dailyCapMinutes: 180,
    });

    // success announcement
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Study preferences saved.')
    );
    // re-populated from PUT response
    await waitFor(() => expect(screen.getByLabelText(/default session length/i)).toHaveValue(30));
  });

  it('renders field-level 400 errors under the matching fields and keeps input', async () => {
    const user = setupUser();
    mockedPut.mockRejectedValue({
      response: {
        data: {
          statusCode: 400,
          message: ['sessionLengthMinutes must be an integer between 5 and 480'],
          error: 'Bad Request',
          errors: {
            sessionLengthMinutes: ['sessionLengthMinutes must be an integer between 5 and 480'],
          },
        },
      },
      message: 'Request failed with status code 400',
    });

    render(<StudyPreferencesForm />);
    await waitFor(() =>
      expect(screen.getByLabelText(/default session length/i)).toBeInTheDocument()
    );

    const defInput = screen.getByLabelText(/default session length/i);
    await user.clear(defInput);
    await user.type(defInput, '60');
    await user.click(screen.getByRole('button', { name: /save study preferences/i }));

    expect(
      await screen.findByText('sessionLengthMinutes must be an integer between 5 and 480')
    ).toBeInTheDocument();
    expect(defInput).toHaveAttribute('aria-invalid', 'true');
    expect(mockedToast.error).not.toHaveBeenCalled();
    expect(defInput).toHaveValue(60);
  });

  it('shows a toast and keeps input values on a generic save failure', async () => {
    const user = setupUser();
    mockedPut.mockRejectedValue(new Error('Network failure'));

    render(<StudyPreferencesForm />);
    await waitFor(() =>
      expect(screen.getByLabelText(/default session length/i)).toBeInTheDocument()
    );

    const defInput = screen.getByLabelText(/default session length/i);
    await user.clear(defInput);
    await user.type(defInput, '60');
    await user.click(screen.getByRole('button', { name: /save study preferences/i }));

    await waitFor(() => expect(mockedToast.error).toHaveBeenCalled());
    expect(defInput).toHaveValue(60);
  });

  it('disables controls while saving', async () => {
    const user = setupUser();
    let resolvePut: (v: StudyPreferences) => void = () => undefined;
    mockedPut.mockImplementation(
      () =>
        new Promise<StudyPreferences>((resolve) => {
          resolvePut = resolve;
        })
    );

    render(<StudyPreferencesForm />);
    await waitFor(() =>
      expect(screen.getByLabelText(/default session length/i)).toBeInTheDocument()
    );

    const saveButton = screen.getByRole('button', { name: /save study preferences/i });
    await user.click(saveButton);

    expect(saveButton).toBeDisabled();
    expect(screen.getByLabelText(/default session length/i)).toBeDisabled();

    // cleanup
    resolvePut(stored);
  });
});

describe('StudyPreferencesForm a11y', () => {
  it('wraps the four inputs in a fieldset with an accessible legend', async () => {
    render(<StudyPreferencesForm />);
    await waitFor(() =>
      expect(screen.getByLabelText(/default session length/i)).toBeInTheDocument()
    );

    const fieldset = document.querySelector('fieldset');
    expect(fieldset).not.toBeNull();
    const legend = fieldset!.querySelector('legend');
    expect(legend).not.toBeNull();
    expect(legend).toHaveClass('sr-only');
    expect(legend).toHaveTextContent('Study session durations');
  });

  it('is keyboard operable: tabbing reaches the save button', async () => {
    const user = setupUser();
    render(<StudyPreferencesForm />);
    await waitFor(() =>
      expect(screen.getByLabelText(/default session length/i)).toBeInTheDocument()
    );

    // Tab through; eventually save button receives focus.
    for (let i = 0; i < 8; i++) {
      await user.tab();
      if (
        document.activeElement === screen.getByRole('button', { name: /save study preferences/i })
      )
        break;
    }
    expect(screen.getByRole('button', { name: /save study preferences/i })).toHaveFocus();
  });
});

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
};

const defaults: StudyPreferences = {
  sessionLengthMinutes: 60,
  minSessionMinutes: 15,
  maxSessionMinutes: 120,
  dailyCapMinutes: 240,
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
  it('calls PUT with the four values and announces success', async () => {
    const user = setupUser();
    const saved: StudyPreferences = {
      sessionLengthMinutes: 30,
      minSessionMinutes: 10,
      maxSessionMinutes: 90,
      dailyCapMinutes: 180,
    };
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

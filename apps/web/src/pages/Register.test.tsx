import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RegisterPage } from './Register';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { authService } from '../services/auth';
import { tokenStore } from '../services/tokenStore';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../services/auth', () => ({
  authService: {
    register: vi.fn(),
    getProfile: vi.fn(),
    login: vi.fn(),
  },
}));

const mockedRegister = vi.mocked(authService.register);
const mockedToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

// Renders the register page inside the same router/context wiring the app
// uses, with a marker on /login so redirects are observable.
const renderRegisterPage = () =>
  render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <AuthProbe />
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/login"
            element={<div data-testid="login-page">Login page</div>}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

// Exposes auth state so tests can assert registration signs nobody in.
let authProbe: { user: unknown; isAuthenticated: boolean } | null = null;
function AuthProbe() {
  const auth = useAuth();
  authProbe = { user: auth.user, isAuthenticated: auth.isAuthenticated };
  return null;
}

const validUser = userEvent.setup();

const fillValidForm = async () => {
  await validUser.type(screen.getByLabelText(/display name/i), 'Ada Lovelace');
  await validUser.type(screen.getByLabelText(/email/i), 'ada@example.com');
  await validUser.type(screen.getByLabelText(/^password/i), 'Password123');
};

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore.clearToken();
    authProbe = null;
  });

  it('shows field-level errors for an empty name, malformed email, and short password without submitting', async () => {
    renderRegisterPage();

    await validUser.type(screen.getByLabelText(/email/i), 'not-an-email');
    await validUser.type(screen.getByLabelText(/^password/i), 'short');
    await validUser.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Display name is required')).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it('accepts an 8-character password without uppercase or number rules', async () => {
    renderRegisterPage();

    await validUser.type(screen.getByLabelText(/display name/i), 'Ada Lovelace');
    await validUser.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await validUser.type(screen.getByLabelText(/^password/i), 'longenough');
    await validUser.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/uppercase/i)).not.toBeInTheDocument();
  });

  it('submits and redirects to /login on success without storing a token or signing in', async () => {
    mockedRegister.mockResolvedValue({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
    renderRegisterPage();

    await fillValidForm();
    await validUser.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockedRegister).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'Password123',
    });
    await waitFor(() =>
      expect(screen.getByTestId('login-page')).toBeInTheDocument(),
    );
    expect(tokenStore.getToken()).toBeNull();
    expect(authProbe?.isAuthenticated).toBe(false);
    expect(authProbe?.user).toBeNull();
    expect(mockedToast.success).toHaveBeenCalledWith(
      'Account created successfully!',
    );
  });

  it('shows an actionable error on a 409 duplicate email', async () => {
    mockedRegister.mockRejectedValue({
      message:
        'An account with this email already exists. Please sign in or register with a different email.',
    });
    renderRegisterPage();

    await fillValidForm();
    await validUser.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(
        expect.stringContaining('already exists'),
      ),
    );
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('keeps the submit button in a loading state during submission', async () => {
    let resolveSubmission: (value: { id: string; name: string; email: string }) => void;
    mockedRegister.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmission = resolve;
        }),
    );
    renderRegisterPage();

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await fillValidForm();
    await validUser.click(submitButton);

    // While loading the button swaps its label for a spinner; the same
    // element must stay disabled for the whole submission.
    expect(submitButton).toBeDisabled();

    resolveSubmission!({ id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' });
    // Completing the submission navigates to /login, so the disabled
    // state is proven during the flight and completion by the redirect.
    await waitFor(() =>
      expect(screen.getByTestId('login-page')).toBeInTheDocument(),
    );
  });

  it('completes the entire form with keyboard only', async () => {
    mockedRegister.mockResolvedValue({
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
    renderRegisterPage();

    const nameInput = screen.getByLabelText(/display name/i);
    nameInput.focus();

    await validUser.keyboard('Ada Lovelace');
    await validUser.tab();
    expect(screen.getByLabelText(/email/i)).toHaveFocus();

    await validUser.keyboard('ada@example.com');
    await validUser.tab();
    expect(screen.getByLabelText(/^password/i)).toHaveFocus();

    await validUser.keyboard('Password123');

    // Enter in the last field submits the form
    await validUser.keyboard('{Enter}');

    expect(mockedRegister).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'Password123',
    });
    await waitFor(() =>
      expect(screen.getByTestId('login-page')).toBeInTheDocument(),
    );
  });
});

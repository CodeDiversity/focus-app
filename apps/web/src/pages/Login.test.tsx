import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeTestStore } from '../test/providers';
import { LoginPage } from './Login';
import { ForgotPasswordPage } from './ForgotPassword';
import { ResetPasswordPage } from './ResetPassword';
import { AuthProvider } from '../context/AuthContext';
import { authService } from '../services/auth';
import { tokenStore } from '@/shared/api/tokenStore';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../services/auth', () => ({
  authService: {
    register: vi.fn(),
    getProfile: vi.fn(),
    login: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

const mockedLogin = vi.mocked(authService.login);
const mockedRefresh = vi.mocked(authService.refreshToken);
const mockedReset = vi.mocked(authService.resetPassword);
const mockedToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

// A 43-character base64url link token (the fragment shape the reset screen
// reads) for the handoff case.
const LINK_TOKEN = 'AbC123_-'.repeat(6).slice(0, 43);

const renderLogin = (state?: unknown) =>
  render(
    <Provider store={makeTestStore()}>
      <MemoryRouter
        initialEntries={[{ pathname: '/login', state } as never]}
      >
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/dashboard" element={<div>Dashboard page</div>} />
            <Route path="/profile" element={<div>Profile page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </Provider>,
  );

// The reset handoff enters from the email link's destination; the same route
// tree lets the reset page navigate to /login with the one-time notice state.
const renderReset = () =>
  render(
    <Provider store={makeTestStore()}>
      <MemoryRouter initialEntries={[`/reset-password#token=${LINK_TOKEN}`]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </Provider>,
  );

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore.clearToken();
    mockedRefresh.mockRejectedValue(new Error('no session'));
    mockedReset.mockResolvedValue({ message: 'Password updated. Please sign in.' });
  });

  it('shows an actionable error on 401 invalid credentials', async () => {
    mockedLogin.mockRejectedValue({ message: 'Invalid email or password' });
    const user = userEvent.setup();
    renderLogin();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled(),
    );

    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // The login thunk rejects asynchronously through the Redux store, so the
    // toast assertion waits for the dispatched rejection to settle.
    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith('Invalid email or password'),
    );
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();
  });

  it('completes the entire form with keyboard only', async () => {
    mockedLogin.mockResolvedValue({
      accessToken: 'token-1',
      user: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' },
    } as never);
    const user = userEvent.setup();
    renderLogin();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled(),
    );

    const emailInput = screen.getByLabelText(/email/i);
    emailInput.focus();
    await user.keyboard('ada@example.com');
    await user.tab();
    expect(screen.getByLabelText(/password/i)).toHaveFocus();

    await user.keyboard('Password123');
    await user.keyboard('{Enter}');

    expect(mockedLogin).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'Password123',
    });
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });

  it('uses a responsive single-column layout that fits mobile widths', async () => {
    const { container } = renderLogin();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled(),
    );

    const outer = container.firstElementChild as HTMLElement;
    expect(outer.className).toContain('min-h-screen');
    expect(outer.className).toContain('px-4');
    expect(outer.className).toContain('sm:px-6');
    expect(outer.className).toContain('lg:px-8');
    const card = container.querySelector('form');
    expect(card?.parentElement?.className).toContain('max-w-md');
    expect(card?.parentElement?.className).toContain('w-full');
  });

  it('shows the session-expired message and returns to the attempted page after re-login', async () => {
    mockedLogin.mockResolvedValue({
      accessToken: 'token-1',
      user: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' },
    } as never);
    const user = userEvent.setup();
    renderLogin({ from: { pathname: '/profile' }, sessionExpired: true });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled(),
    );

    expect(mockedToast.error).toHaveBeenCalledWith(
      'Your session has expired. Please sign in again.',
    );

    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Profile page')).toBeInTheDocument();
  });

  it('routes the forgot-password link to the request screen', async () => {
    const user = userEvent.setup();
    renderLogin();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled(),
    );

    await user.click(screen.getByRole('link', { name: /forgot password/i }));

    expect(await screen.findByText('Reset your password')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('does not show the reset notice on an ordinary visit', async () => {
    renderLogin();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled(),
    );
    expect(mockedToast.success).not.toHaveBeenCalled();
  });

  it('shows the one-time reset notice after the handoff and consumes it once', async () => {
    const user = userEvent.setup();
    renderReset();
    await user.type(await screen.findByLabelText(/^new password$/i), 'NewPassword1!');
    await user.type(screen.getByLabelText(/^confirm new password$/i), 'NewPassword1!');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    // The handoff lands on /login with the notice state (C3/C10).
    await waitFor(() =>
      expect(mockedToast.success).toHaveBeenCalledWith(
        'Password updated — sign in with your new password.',
      ),
    );
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

    // Consumed once: a re-render (typing) must not re-fire the toast.
    await user.type(screen.getByLabelText(/^email$/i), 'ada@example.com');
    expect(mockedToast.success).toHaveBeenCalledTimes(1);
  });
});

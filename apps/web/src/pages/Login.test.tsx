import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './Login';
import { AuthProvider } from '../context/AuthContext';
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
    refreshToken: vi.fn(),
    logout: vi.fn(),
  },
}));

const mockedLogin = vi.mocked(authService.login);
const mockedRefresh = vi.mocked(authService.refreshToken);
const mockedToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

const renderLogin = (state?: unknown) =>
  render(
    <MemoryRouter
      initialEntries={[{ pathname: '/login', state } as never]}
    >
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
          <Route path="/profile" element={<div>Profile page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore.clearToken();
    mockedRefresh.mockRejectedValue(new Error('no session'));
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

    expect(mockedToast.error).toHaveBeenCalledWith('Invalid email or password');
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
});

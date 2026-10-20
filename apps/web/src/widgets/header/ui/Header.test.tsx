import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Header } from '@/widgets/header/ui/Header';
import { useAuth } from '@/features/auth/model/AuthContext';
import type { SessionUser } from '@/entities/user/model/types';

type AuthContextType = ReturnType<typeof useAuth>;

vi.mock('@/features/auth/model/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

const sessionUser: SessionUser = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerifiedAt: null,
};

function authValue(overrides: Partial<AuthContextType>): AuthContextType {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    clearError: vi.fn(),
    refreshProfile: vi.fn(),
    isVerificationBannerDismissed: false,
    dismissVerificationBanner: vi.fn(),
    ...overrides,
  };
}

function renderHeader(path: string, auth: Partial<AuthContextType>) {
  mockedUseAuth.mockReturnValue(authValue(auth));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<Header />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Header semesters navigation (F110B-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the Semesters link for an authenticated user', () => {
    renderHeader('/dashboard', { isAuthenticated: true, user: sessionUser });

    const link = screen.getByRole('link', { name: 'Semesters' });
    expect(link).toHaveAttribute('href', '/semesters');
    // The other authenticated links remain alongside it.
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
  });

  it('hides the Semesters link (and other protected links) when unauthenticated', () => {
    renderHeader('/', { isAuthenticated: false, user: null });

    expect(screen.queryByRole('link', { name: 'Semesters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument();
    // Public navigation is unaffected.
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
  });

  it('applies the active highlight to the Semesters link only on /semesters', () => {
    const { unmount } = renderHeader('/semesters', {
      isAuthenticated: true,
      user: sessionUser,
    });

    const semesters = screen.getByRole('link', { name: 'Semesters' });
    expect(semesters.className).toContain('text-primary-600');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveClass('text-primary-600');
    expect(screen.getByRole('link', { name: 'Profile' })).not.toHaveClass('text-primary-600');

    unmount();
    renderHeader('/profile', { isAuthenticated: true, user: sessionUser });

    expect(screen.getByRole('link', { name: 'Semesters' })).not.toHaveClass('text-primary-600');
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveClass('text-primary-600');
  });
});

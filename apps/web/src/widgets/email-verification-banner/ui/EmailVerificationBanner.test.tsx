import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { setupUser } from '@/test/user';
import { useNavigate } from 'react-router-dom';
import { Providers } from '@/test/providers';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Layout } from '@/widgets/layout/ui/Layout';
import { AuthProvider, useAuth } from '@/features/auth/model/AuthContext';
import api from '@/shared/api/httpClient';
import { tokenStore } from '@/shared/api/tokenStore';

const ada = {
  id: 'ada',
  name: 'Ada',
  email: 'ada@example.com',
  emailVerifiedAt: null as string | null,
};
const grace = { ...ada, id: 'grace', name: 'Grace', email: 'grace@example.com' };
let session: typeof ada | null;
let profile: typeof ada;
let restore: ((config: InternalAxiosRequestConfig) => Promise<AxiosResponse>) | undefined;
let resend: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;
let resendEmails: string[];
function ok(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { config, data, status: 200, statusText: 'OK', headers: {} };
}
function Probe() {
  const auth = useAuth();
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate('/profile')}>Navigate</button>
      <button onClick={() => void auth.login('ada@example.com', 'password')}>Login Ada</button>
      <button onClick={() => void auth.login('grace@example.com', 'password')}>Login Grace</button>
    </>
  );
}
function renderBanner() {
  return render(
    <Providers initialEntries={['/profile']}>
      <AuthProvider>
        <Layout>
          <Probe />
        </Layout>
      </AuthProvider>
    </Providers>
  );
}

describe('EmailVerificationBanner', () => {
  beforeEach(() => {
    tokenStore.clearToken();
    session = ada;
    profile = ada;
    restore = undefined;
    resendEmails = [];
    resend = async (config) => ok(config, { message: 'generic' });
    api.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') {
        if (restore) return restore(config);
        if (!session)
          throw new AxiosError('unauthorized', '', config, null, {
            config,
            data: {},
            headers: {},
            status: 401,
            statusText: '',
          });
        return ok(config, { accessToken: 'session', user: session });
      }
      if (config.url === '/auth/resend-verification') {
        resendEmails.push(JSON.parse(config.data).email);
        return resend(config);
      }
      if (config.url === '/users/me')
        return ok(config, { ...profile, createdAt: '', updatedAt: '' });
      if (config.url === '/auth/login') {
        const email = JSON.parse(config.data).email;
        return ok(config, { accessToken: 'session', user: email === ada.email ? ada : grace });
      }
      if (config.url === '/auth/logout') return ok(config, {});
      throw new Error('Unexpected test request');
    };
  });

  it.each(['loading', 'anonymous', 'verified', 'unknown'] as const)(
    'does not show for %s students',
    async (state) => {
      let finishRestore!: () => void;
      if (state === 'loading')
        restore = (config) =>
          new Promise((resolve) => {
            finishRestore = () => resolve(ok(config, { accessToken: 'session', user: ada }));
          });
      if (state === 'anonymous') session = null;
      if (state === 'verified') session = { ...ada, emailVerifiedAt: '2026-10-14' };
      if (state === 'unknown') session = { ...ada, emailVerifiedAt: undefined as unknown as null };
      renderBanner();
      await act(async () => {});
      expect(screen.queryByRole('region', { name: /verify your email/i })).not.toBeInTheDocument();
      if (state === 'loading')
        await act(async () => {
          finishRestore();
        });
    }
  );

  it('shows only for a loaded unverified student', async () => {
    renderBanner();
    expect(await screen.findByRole('region', { name: /verify your email/i })).toBeInTheDocument();
    expect(screen.getByText(/you can keep using studypilot/i)).toBeInTheDocument();
  });

  it('stays dismissed through navigation and keeps recovery available', async () => {
    renderBanner();
    const user = setupUser();
    await user.click(
      await screen.findByRole('button', { name: /dismiss email verification reminder/i })
    );
    await user.click(screen.getByRole('button', { name: 'Navigate' }));
    expect(screen.queryByRole('region', { name: /verify your email/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    expect(screen.getByRole('menuitem', { name: 'Verify email' })).toHaveAttribute(
      'href',
      '/verify-email'
    );
  });

  it('reappears after logout and login or app reload', async () => {
    const view = renderBanner();
    const user = setupUser();
    await user.click(
      await screen.findByRole('button', { name: /dismiss email verification reminder/i })
    );
    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Logout' }));
    await user.click(screen.getByRole('button', { name: 'Login Ada' }));
    expect(await screen.findByRole('region', { name: /verify your email/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /dismiss email verification reminder/i }));
    view.unmount();
    renderBanner();
    expect(await screen.findByRole('region', { name: /verify your email/i })).toBeInTheDocument();
  });

  it('does not carry dismissal to another account', async () => {
    renderBanner();
    const user = setupUser();
    await user.click(
      await screen.findByRole('button', { name: /dismiss email verification reminder/i })
    );
    await user.click(screen.getByRole('button', { name: 'Login Grace' }));
    expect(await screen.findByRole('region', { name: /verify your email/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /resend verification email/i }));
    expect(resendEmails).toEqual(['grace@example.com']);
  });

  it('shows local resend loading cooldown and generic feedback without blocking navigation', async () => {
    let finish!: () => void;
    resend = (config) =>
      new Promise((resolve) => {
        finish = () => resolve(ok(config, { message: 'generic' }));
      });
    renderBanner();
    const user = setupUser();
    await user.dblClick(await screen.findByRole('button', { name: /resend verification email/i }));
    expect(resendEmails).toEqual(['ada@example.com']);
    expect(screen.getByRole('button', { name: /requesting email/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Navigate' })).toBeEnabled();
    await act(async () => {
      finish();
    });
    await waitFor(() =>
      expect(screen.getByRole('status', { name: /banner resend/i })).toHaveTextContent(
        /if this email needs verification/i
      )
    );
    expect(screen.getByText(/try again in 60 seconds/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend verification email/i })).toBeDisabled();
  });

  it('shows an actionable network error with retry available', async () => {
    resend = async (config) => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    };
    renderBanner();
    await setupUser().click(
      await screen.findByRole('button', { name: /resend verification email/i })
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /check your connection and try again/i
    );
    expect(screen.getByRole('button', { name: /resend verification email/i })).toBeEnabled();
  });

  it('hides after verified profile reconciliation on focus', async () => {
    renderBanner();
    await screen.findByRole('region', { name: /verify your email/i });
    profile = { ...ada, emailVerifiedAt: '2026-10-14' };
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(screen.queryByRole('region', { name: /verify your email/i })).not.toBeInTheDocument();
  });

  it('supports keyboard dismissal and resend', async () => {
    renderBanner();
    const user = setupUser();
    const resendButton = await screen.findByRole('button', { name: /resend verification email/i });
    resendButton.focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(resendEmails).toEqual(['ada@example.com']));
    const dismiss = screen.getByRole('button', { name: /dismiss email verification reminder/i });
    dismiss.focus();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('region', { name: /verify your email/i })).not.toBeInTheDocument();
  });
});

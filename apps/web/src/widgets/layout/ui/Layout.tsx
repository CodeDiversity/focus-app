import { ReactNode } from 'react';
import { Header } from '@/widgets/header/ui/Header';
import { CurrentSessionProvider } from '@/widgets/session-indicator/model/CurrentSessionProvider';
import { EmailVerificationBanner } from '@/widgets/email-verification-banner/ui/EmailVerificationBanner';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    // EP16D (D-D8): one current-session read for the whole shell — the header
    // strip now, EP16E's tab bar and the Focus page's refresh later.
    <CurrentSessionProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-surface focus:text-text focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-focus-ring"
        >
          Skip to main content
        </a>
        <Header />
        <main id="main-content" tabIndex={-1} className="flex-grow">
          <EmailVerificationBanner />
          {children}
        </main>
      </div>
    </CurrentSessionProvider>
  );
}

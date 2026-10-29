import { ReactNode } from 'react';
import { Header } from '@/widgets/header/ui/Header';
import { EmailVerificationBanner } from '@/widgets/email-verification-banner/ui/EmailVerificationBanner';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
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
  );
}

import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { Header } from '@/widgets/header/ui/Header';
import { CurrentSessionProvider } from '@/widgets/session-indicator/model/CurrentSessionProvider';
import { TabBar } from '@/widgets/tab-bar/ui/TabBar';
import { useTabBarVisible } from '@/widgets/tab-bar/model/useTabBarVisible';
import { EmailVerificationBanner } from '@/widgets/email-verification-banner/ui/EmailVerificationBanner';

interface LayoutProps {
  children: ReactNode;
}

/** Inside the provider so the tab-bar rule can read the shared session state. */
function LayoutChrome({ children }: LayoutProps) {
  const tabBarVisible = useTabBarVisible();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-surface focus:text-text focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-focus-ring"
      >
        Skip to main content
      </a>
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        // EP16E-AC2: room for the fixed bar plus the device safe area, so no
        // page control ends up underneath it.
        className={clsx(
          'flex-grow',
          tabBarVisible && 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]'
        )}
      >
        <EmailVerificationBanner />
        {children}
      </main>
      {tabBarVisible && <TabBar />}
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    // EP16D (D-D8): one current-session read for the whole shell — the header
    // strip, the tab bar's hide-on-focus rule and the Focus page's refresh.
    <CurrentSessionProvider>
      <LayoutChrome>{children}</LayoutChrome>
    </CurrentSessionProvider>
  );
}

import { ReactNode } from 'react';
import { Header } from './Header';
import { EmailVerificationBanner } from './EmailVerificationBanner';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <EmailVerificationBanner />
      <main className="flex-grow">{children}</main>
    </div>
  );
}

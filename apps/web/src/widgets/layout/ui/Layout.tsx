import { ReactNode } from 'react';
import { Header } from '@/widgets/header/ui/Header';
import { EmailVerificationBanner } from '@/widgets/email-verification-banner/ui/EmailVerificationBanner';

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

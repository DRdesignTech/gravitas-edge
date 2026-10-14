'use client';

import { AuthProvider } from '@/lib/auth';
import { GuestResumeProvider } from '@/lib/guest-resume';
import { ToastProvider } from '@/components/ui';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import Header from './Header';
import Footer from './Footer';
import NavigationTracker from './NavigationTracker';
import CookieConsent from './CookieConsent';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GuestResumeProvider>
          <ToastProvider>
            <div className="flex min-h-screen flex-col overflow-x-clip bg-surface-muted text-content">
              <Header />
              <main className="flex-1">
                <NavigationTracker />
                {children}
              </main>
              <Footer />
              <CookieConsent />
            </div>
          </ToastProvider>
        </GuestResumeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

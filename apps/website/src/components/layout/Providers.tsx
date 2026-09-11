'use client';

import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import Header from './Header';
import Footer from './Footer';
import FloatingResumeButton from '@/components/marketing/FloatingResumeButton';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <div className="flex min-h-screen flex-col overflow-x-hidden bg-surface-muted text-content">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <FloatingResumeButton />
          </div>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

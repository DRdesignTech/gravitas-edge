'use client';

import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

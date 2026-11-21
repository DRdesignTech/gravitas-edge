import Script from 'next/script';
import '../styles/globals.css';
import Providers from '@/components/layout/Providers';
import ChatbotWidget from '@/components/chat/ChatbotWidget';
import WelcomeSplashModal from '@/components/marketing/WelcomeSplashModal';
import RecentPurchasePopup from '@/components/marketing/RecentPurchasePopup';
import Toast from '@/components/ui/Toast';

export const metadata = {
  title: 'Gravitas Edge Consulting — Find your next opportunity',
  description:
    'Find job opportunities across India and worldwide. Unlock premium vaults and take the next step in your career.',
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('jp-theme');
    document.documentElement.classList.toggle('dark', t === 'dark');
  } catch(e) {}
})();
`.trim();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <ChatbotWidget />
        <WelcomeSplashModal />
        <RecentPurchasePopup />
        <Toast />
      </body>
    </html>
  );
}

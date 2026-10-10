import { Poppins, Lora, Cormorant_Garamond } from 'next/font/google';
import '../styles/globals.css';
import Providers from '@/components/layout/Providers';
import ChatbotWidget from '@/components/chat/ChatbotWidget';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-serif',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-display',
});

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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${poppins.variable} ${lora.variable} ${cormorant.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <ChatbotWidget />
      </body>
    </html>
  );
}

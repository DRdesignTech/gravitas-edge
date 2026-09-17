import { Poppins } from 'next/font/google';
import '../styles/globals.css';
import Providers from '@/components/layout/Providers';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata = {
  title: 'Gravitas Edge Consulting — Find your next opportunity',
  description:
    'Discover curated job opportunities across India and the globe. Unlock premium opportunity vaults and advance your career.',
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
      <body className={`${poppins.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

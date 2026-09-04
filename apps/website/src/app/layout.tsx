import '../styles/globals.css';
import Providers from '@/components/layout/Providers';

export const metadata = {
  title: 'Gravits Edge Consultant — Find your next opportunity',
  description:
    'Discover curated job opportunities across India and the globe. Unlock premium referral vaults and advance your career.',
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('jp-theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

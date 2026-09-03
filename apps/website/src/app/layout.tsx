import '../styles/globals.css';

export const metadata = {
  title: 'Job Portal',
  description: 'Find your next opportunity',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

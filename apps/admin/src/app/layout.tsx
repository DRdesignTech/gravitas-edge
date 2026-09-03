import '../styles/globals.css';

export const metadata = {
  title: 'Job Portal Admin',
  description: 'Job Search Portal Administration Panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

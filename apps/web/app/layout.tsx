import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Volleyball Season Manager',
  description: 'Community volleyball season operations and scheduling',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

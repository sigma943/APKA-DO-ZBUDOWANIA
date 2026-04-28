import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PKS Live',
  description: 'PKS Live - sledzenie autobusow na zywo.',
  applicationName: 'PKS Live',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pl">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

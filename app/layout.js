import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import AuthSessionProvider from '@/components/session-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'MK8DX Competitive Hub',
  description: 'Master the Track. Rule the Lounge. - Hub compétitif pour Mario Kart 8 Deluxe',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthSessionProvider>
          {children}
          <Toaster />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
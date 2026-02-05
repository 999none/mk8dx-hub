import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import AuthSessionProvider from '@/components/session-provider';
import ServiceWorkerProvider from '@/components/ServiceWorkerProvider';
import PageTransitionProvider from '@/components/PageTransitionProvider';

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
          <ServiceWorkerProvider>
            <PageTransitionProvider transitionType="fade">
              {children}
            </PageTransitionProvider>
          </ServiceWorkerProvider>
          <Toaster />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
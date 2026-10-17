import type { Metadata, Viewport } from 'next';
import { I18nProvider } from '@/components/I18nProvider';
import { getLang } from '@/lib/i18n/server';
import './globals.css';

export const metadata: Metadata = {
  title: 'mySex',
  description: 'The private, 18+ sex & cycle tracker for two.',
  applicationName: 'mySex',
  appleWebApp: { capable: true, title: 'mySex', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0e070d',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang === 'zh' ? 'zh-CN' : 'en'}>
      <body className="antialiased">
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}

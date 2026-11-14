import type { Metadata, Viewport } from 'next';
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { Footer } from '@/components/Footer';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
});

const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-serif',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-mono',
});

export const viewport: Viewport = {
  themeColor: '#080c14',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'unfold — Anonim Dertleşme ve Dayanışma Forumu',
  description:
    'Aynı dertlere sahip insanların yargılanmadan birbirini bulabildiği, anonim ve güvenli dertleşme platformu.',
  applicationName: 'unfold',
  openGraph: {
    title: 'unfold — Anonim Dertleşme ve Dayanışma Forumu',
    description:
      'Aynı yoldan geçenlerle buluş, yargılanmadan içini dök. %100 anonim ve güvenli akran dayanışması.',
    type: 'website',
    locale: 'tr_TR',
    siteName: 'unfold',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'unfold',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`dark ${jakarta.variable} ${fraunces.variable} ${jetbrains.variable}`}>
      <body className="flex min-h-screen flex-col bg-[#070a12] font-sans text-slate-200 antialiased">
        <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.14),_rgba(56,189,248,0.05)_45%,_transparent_75%)]" />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}

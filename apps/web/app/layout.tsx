import type { ReactNode } from 'react';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';

// Clean modern sans for the UI; elegant serif reserved for editorial titles.
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const serif = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata = {
  title: 'PPV — Programa de Psicólogos Voluntarios',
  description: 'Apoyo psicológico tras el terremoto · Venezuela 2026',
};

export const viewport = {
  themeColor: '#0f766e',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-VE" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}

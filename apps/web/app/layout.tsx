import type { ReactNode } from 'react';
import { Poppins } from 'next/font/google';
import './globals.css';

// Single brand typeface (FPV guidelines): Poppins for UI and headings.
const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata = {
  title: 'PPV — Programa de Psicólogos Voluntarios',
  description: 'Apoyo psicológico tras el terremoto · Venezuela 2026',
};

export const viewport = {
  themeColor: '#191a36',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-VE" className={poppins.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}

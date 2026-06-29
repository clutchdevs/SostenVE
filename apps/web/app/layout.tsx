import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Sostén',
  description: 'Apoyo psicológico tras el terremoto · Venezuela 2026',
};

export const viewport = {
  themeColor: '#0f766e',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-VE">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

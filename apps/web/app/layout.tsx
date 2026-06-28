import type { ReactNode } from 'react';

export const metadata = {
  title: 'Sostén',
  description: 'Apoyo psicológico tras el terremoto · Venezuela 2026',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-VE">
      <body>{children}</body>
    </html>
  );
}

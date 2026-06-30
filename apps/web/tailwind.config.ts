import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#0f766e', dark: '#115e59' },
        risk: { high: '#dc2626', moderate: '#d97706', followup: '#0f766e' },
        // Premium dashboard palette (warm, calm, enterprise).
        surface: { DEFAULT: '#F8F5EF', card: '#FFFFFF' },
        navy: { DEFAULT: '#203B5A', light: '#2C4F77', hover: '#28598A' },
        ink: '#1F2A37',
        accent: { orange: '#E07A3F', blue: '#2563EB', danger: '#C0392B' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'Cambria', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config;

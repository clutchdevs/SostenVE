import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#0f766e', dark: '#115e59' },
        risk: { high: '#dc2626', moderate: '#d97706', followup: '#0f766e' },
      },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // PPV brand palette, derived from the institutional logo (blue briefcase +
        // navy hands). These drive the whole app's brand identity.
        ppv: {
          blue: { DEFAULT: '#1F5FA6', dark: '#17487D' }, // medium logo blue (actions)
          sky: '#4A93D6', // lighter logo blue (accents)
          navy: '#1A2A5C', // deep logo navy (headings)
          tint: '#EEF4FB', // soft blue canvas
        },
        // Brand = the PPV logo blue (was teal). `risk.followup` stays green — it is
        // a semantic urgency level (red/amber/green traffic light), not the brand.
        brand: { DEFAULT: '#1F5FA6', dark: '#17487D' },
        risk: { high: '#dc2626', moderate: '#d97706', followup: '#0f766e' },
        // App canvas + sidebar, aligned to the logo (soft blue tint, deep navy).
        surface: { DEFAULT: '#EEF4FB', card: '#FFFFFF' },
        navy: { DEFAULT: '#1A2A5C', light: '#26407C', hover: '#2E4E96' },
        ink: '#1F2A37',
        accent: {
          orange: '#E07A3F',
          blue: '#2563EB',
          danger: '#C0392B',
          green: '#138A72',
          teal: '#5CB8B2',
          amber: '#D89B29',
          coral: '#D55A4E',
        },
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

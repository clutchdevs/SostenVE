import type { Config } from 'tailwindcss';

/**
 * PPV brand palette (FPV guidelines). The whole app uses ONLY the brand colors:
 *   dark blue  #191a36 · light blue #5582c2 · white #ffffff · black #000000
 * plus tints/shades of those for hierarchy (muted text, borders, canvases).
 *
 * The one exception is RED, kept exclusively for crisis lines / high-risk and
 * error alerts (life-safety signal, non-negotiable). To honour "only brand
 * colors" without editing every file, the neutral (`slate`) and status
 * (`emerald`/`green`/`teal`/`amber`) Tailwind scales are re-mapped to brand
 * tints below; `red`/`rose` are left intact for the crisis signal.
 */

// Blue-tinted neutral (shades of dark blue #191a36 over white) — replaces gray.
const brandNeutral = {
  50: '#f5f6f9',
  100: '#eaebf1',
  200: '#d6d8e4',
  300: '#b4b8cd',
  400: '#8c91ae',
  500: '#686e8f',
  600: '#4f5571',
  700: '#3c415a',
  800: '#2b2f45',
  900: '#21243b',
  950: '#191a36',
};

// Light-blue scale (around #5582c2) — replaces the "positive/status" greens/ambers.
const brandBlue = {
  50: '#eef3fb',
  100: '#dde8f6',
  200: '#c3d6ef',
  300: '#9dbce2',
  400: '#789ed4',
  500: '#5582c2',
  600: '#45699e',
  700: '#3a5682',
  800: '#324769',
  900: '#2c3d57',
  950: '#1f2b41',
};

export default {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- Brand tokens (the 4 official colors + shades) ---
        // Light blue = primary/brand actions, links, accents. Dark blue = hover.
        brand: { DEFAULT: '#5582c2', dark: '#191a36' },
        ppv: {
          blue: { DEFAULT: '#5582c2', dark: '#191a36' },
          sky: '#5582c2',
          navy: '#191a36',
          tint: '#f2f5fb', // soft light-blue canvas
        },
        // Dark blue: sidebars, headers, strong surfaces, primary text.
        navy: { DEFAULT: '#191a36', light: '#2c2e54', hover: '#24264a' },
        ink: '#191a36',
        // Canvas + cards.
        surface: { DEFAULT: '#f2f5fb', card: '#FFFFFF' },
        // Risk: high = RED (kept). Moderate/followup mapped to brand tones.
        risk: { high: '#dc2626', moderate: '#191a36', followup: '#5582c2' },
        // Legacy accent slots remapped to brand (danger/coral stay red = alert).
        accent: {
          orange: '#191a36',
          blue: '#5582c2',
          danger: '#dc2626',
          green: '#5582c2',
          teal: '#5582c2',
          amber: '#191a36',
          coral: '#dc2626',
        },
        // --- Default Tailwind scales re-mapped to brand (so existing hardcoded
        //     classes become on-brand automatically). `red`/`rose` untouched. ---
        slate: brandNeutral,
        gray: brandNeutral,
        zinc: brandNeutral,
        neutral: brandNeutral,
        emerald: brandBlue,
        green: brandBlue,
        teal: brandBlue,
        amber: brandNeutral, // moderate/connecting/warning → neutral dark-blue tint
      },
      fontFamily: {
        // Single brand typeface (FPV guidelines): Poppins for UI and headings.
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        serif: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(25, 26, 54, 0.05), 0 1px 3px rgba(25, 26, 54, 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;

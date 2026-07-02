/**
 * Shared UI class recipes so the public and auth screens match the staff
 * dashboard palette (warm `surface` canvas, `ink` text, `surface-card` panels
 * with `shadow-card`, serif headings, `brand`/`accent` colors). Import `ui` and
 * apply these instead of ad-hoc `brand`/`rounded-md` styling.
 */
export const ui = {
  /** Full-height public page canvas (the staff layouts set their own shell). */
  page: 'min-h-screen bg-ppv-tint text-ink',
  /** Card / panel surface. */
  card: 'rounded-2xl border border-slate-200/80 bg-surface-card shadow-card',
  /** Text input / select. */
  field:
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-ink placeholder:text-slate-400 outline-none transition-colors focus:border-ppv-blue focus:ring-1 focus:ring-ppv-blue',
  /** Primary action button. */
  primaryBtn:
    'rounded-xl bg-ppv-blue px-4 py-2.5 font-medium text-white transition-colors hover:bg-ppv-blue-dark disabled:opacity-50',
  /** Secondary / outline button. */
  secondaryBtn:
    'rounded-xl border border-slate-300 px-4 py-2.5 font-medium text-ink transition-colors hover:bg-slate-50 disabled:opacity-50',
  /** Serif heading (size set per use). */
  heading: 'font-serif font-semibold text-ink',
  /** Muted helper/subtitle text. */
  muted: 'text-sm text-slate-600',
  /** Back / inline link. */
  link: 'text-sm font-medium text-ppv-blue hover:underline',
  /** Inline error message. */
  error: 'text-sm text-risk-high',
} as const;

/**
 * Branded email rendering (PPV / FPV identity). A single content model renders
 * both a plain-text version (accessibility + fallback) and a responsive HTML
 * version using the brand palette (dark blue #191a36, light blue #5582c2, white)
 * and Poppins (with safe fallbacks, since email clients vary in web-font support).
 *
 * HTML is table-based with inline styles for broad client compatibility
 * (Gmail/Outlook strip classes and <head> styles); all interpolated values are
 * HTML-escaped.
 */

const DARK = '#191a36';
const BLUE = '#5582c2';
const CANVAS = '#f2f5fb';
const MUTED = '#5b5f78';
const FONT = "'Poppins', Arial, Helvetica, sans-serif";

export interface EmailButton {
  label: string;
  url: string;
}

export interface EmailInfoRow {
  label: string;
  value: string;
  /** Render the value in a monospaced style (e.g. a temporary password). */
  mono?: boolean;
}

export interface EmailContent {
  /** Hidden preview text shown by many clients next to the subject. */
  preheader: string;
  /** Heading inside the card. */
  title: string;
  /** e.g. "Hola Ana," */
  greeting: string;
  /** Body paragraphs before the info box / button. */
  paragraphs: string[];
  /** Boxed key/value details (credentials, expiry…). */
  infoRows?: EmailInfoRow[];
  /** Primary call-to-action button. */
  button?: EmailButton;
  /** Paragraphs after the button. */
  afterParagraphs?: string[];
  /** Small muted note at the end (e.g. "si no esperabas…"). */
  note?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Plain-text version of the email (fallback + accessibility). */
export function renderText(c: EmailContent): string {
  const lines: string[] = [c.greeting, ''];
  for (const p of c.paragraphs) lines.push(p, '');
  for (const row of c.infoRows ?? []) lines.push(`  ${row.label}: ${row.value}`);
  if (c.infoRows?.length) lines.push('');
  if (c.button) lines.push(`  ${c.button.label}: ${c.button.url}`, '');
  for (const p of c.afterParagraphs ?? []) lines.push(p, '');
  if (c.note) lines.push(c.note, '');
  lines.push('Federación de Psicólogos de Venezuela · PPV');
  return lines.join('\n');
}

/** Responsive, brand-styled HTML version. */
export function renderHtml(c: EmailContent): string {
  const paragraph = (text: string, color = DARK) =>
    `<p style="margin:0 0 14px;color:${color};font-size:15px;line-height:1.6;">${escapeHtml(text)}</p>`;

  const infoBox = c.infoRows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};border-radius:12px;margin:4px 0 20px;">
        <tr><td style="padding:16px 20px;">
          ${c.infoRows
            .map(
              (row) =>
                `<div style="font-size:14px;line-height:1.7;color:${DARK};">${escapeHtml(row.label)}: <strong style="${
                  row.mono ? "font-family:'Courier New',monospace;letter-spacing:.5px;" : ''
                }">${escapeHtml(row.value)}</strong></div>`,
            )
            .join('')}
        </td></tr>
      </table>`
    : '';

  const button = c.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr>
        <td style="border-radius:12px;background:${BLUE};">
          <a href="${escapeHtml(c.button.url)}" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">${escapeHtml(
            c.button.label,
          )}</a>
        </td></tr></table>`
    : '';

  const note = c.note
    ? `<p style="margin:20px 0 0;color:${MUTED};font-size:13px;line-height:1.6;">${escapeHtml(c.note)}</p>`
    : '';

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');</style>
</head>
<body style="margin:0;padding:0;background:${CANVAS};font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 1px 3px rgba(25,26,54,.08);">
      <tr><td style="background:${DARK};padding:26px 32px;font-family:${FONT};">
        <div style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:.5px;">PP<span style="color:${BLUE};">V</span></div>
        <div style="color:#aab0d4;font-size:12px;margin-top:3px;letter-spacing:.3px;">Programa de Psicólogos Voluntarios</div>
      </td></tr>
      <tr><td style="padding:32px;font-family:${FONT};">
        <h1 style="margin:0 0 18px;font-size:20px;font-weight:600;color:${DARK};">${escapeHtml(c.title)}</h1>
        ${paragraph(c.greeting)}
        ${c.paragraphs.map((p) => paragraph(p)).join('')}
        ${infoBox}
        ${button}
        ${(c.afterParagraphs ?? []).map((p) => paragraph(p)).join('')}
        ${note}
      </td></tr>
      <tr><td style="padding:20px 32px;background:${CANVAS};font-family:${FONT};color:${MUTED};font-size:12px;line-height:1.6;">
        Federación de Psicólogos de Venezuela · PPV<br>
        Mensaje automático — por favor no respondas a este correo.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

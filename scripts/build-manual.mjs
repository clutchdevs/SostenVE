#!/usr/bin/env node
/**
 * Construye el manual de usuario como HTML vistoso y PDF (portada + índice +
 * numeración de páginas), a partir de docs/04-testing/manual-de-usuario.md.
 *
 *   npm install marked puppeteer --no-save
 *   node scripts/build-manual.mjs
 *
 * Salidas: docs/04-testing/manual-de-usuario.html  y  manual-de-usuario.pdf
 */
import { marked } from 'marked';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', '04-testing');
const md = readFileSync(join(dir, 'manual-de-usuario.md'), 'utf8');

// El cuerpo empieza en la primera sección real; la portada y el índice los arma
// este script (no salen del .md).
const start = md.indexOf('## Los 4 tipos de usuario');
const bodyMd = start >= 0 ? md.slice(start) : md;
let content = marked.parse(bodyMd, { gfm: true, breaks: false });

// Agrupar cada imagen con su pie de foto en un <figure> para que NUNCA se
// separen al saltar de página (page-break-inside: avoid).
content = content.replace(
  /<p align="center">\s*(<img\b[^>]*>)\s*<\/p>\s*<p><em>([\s\S]*?)<\/em><\/p>/g,
  '<figure class="fig">$1<figcaption>$2</figcaption></figure>',
);

const FECHA = new Date().toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
const YEAR = new Date().getFullYear();

const toc = [
  ['A', 'Solicitante', 'Cómo una persona pide apoyo (público, sin cuenta).', '#parte-a--solicitante-persona-que-pide-ayuda'],
  ['B', 'Psicólogo voluntario', 'Registro, disponibilidad y atención de casos.', '#parte-b--psicólogo-voluntario'],
  ['C', 'Coordinador', 'Cola en vivo, reasignación y gestión de voluntarios.', '#parte-c--coordinador'],
  ['D', 'Administrador', 'Configuración y supervisión de la plataforma.', '#parte-d--administrador'],
  ['✓', 'Guion de pruebas', 'Recorrido end-to-end sugerido para la FPV.', '#guion-de-pruebas-sugerido-recorrido-end-to-end'],
  ['ℹ', 'Notas para las pruebas', 'Formatos, correos, disponibilidad, móvil.', '#notas-para-las-pruebas'],
];

const html = `<!doctype html>
<html lang="es-VE">
<head>
<meta charset="utf-8">
<title>Manual de usuario — PPV</title>
<style>
  @page{ size:A4; }
  :root{
    --brand:#2f6bd6; --brand-dark:#1e3a8a; --navy:#191a36;
    --ink:#1f2937; --muted:#6b7280; --line:#e6e8ee; --tint:#eef4fd; --tint2:#f7f9fc;
  }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:var(--ink); line-height:1.62; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  /* En PDF los márgenes de página los pone puppeteer (uniformes en TODAS las
     páginas). En pantalla simulamos hojas con padding + sombra. */
  .page{ width:100%; }
  @media screen{
    body{ background:#eceef3; }
    .page{ width:210mm; min-height:277mm; padding:15mm 16mm; margin:22px auto;
      background:#fff; box-shadow:0 6px 24px rgba(0,0,0,.12); }
  }
  @media print{ .cover,.toc{ min-height:262mm; } }

  /* ── Portada (tarjeta con degradado) ── */
  .cover{ display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;
    background:linear-gradient(160deg,#22307a 0%,#2f6bd6 100%); color:#fff; border-radius:16px;
    padding:24mm 20mm; page-break-after:always; }
  .cover .logo{ width:148px; height:148px; border-radius:28px; background:#fff; padding:10px; object-fit:contain;
    box-shadow:0 14px 34px rgba(0,0,0,.28); }
  .cover .kicker{ margin-top:30px; letter-spacing:3px; text-transform:uppercase; font-size:12px;
    font-weight:700; color:#cfe0ff; }
  .cover h1{ margin:10px 0 0; font-size:46px; line-height:1.1; color:#fff; font-weight:800; }
  .cover .sub{ margin-top:14px; font-size:17px; color:#e8eefb; font-weight:600; }
  .cover .sub b{ color:#fff; }
  .cover .divider{ width:72px; height:4px; border-radius:3px; background:#8fb4ff; margin:22px auto; }
  .cover .tag{ max-width:430px; color:#c7d3f0; font-size:14px; }
  .cover .foot{ margin-top:46px; color:#b8c4e6; font-size:12.5px; }
  .cover .foot b{ color:#fff; }

  /* ── Índice ── */
  .toc h2{ font-size:24px; color:var(--navy); margin:0 0 4px; border:0; background:none; padding:0; }
  .toc .lead{ color:var(--muted); margin:0 0 22px; font-size:13.5px; }
  .toc ol{ list-style:none; margin:0; padding:0; }
  .toc li{ display:flex; gap:14px; align-items:flex-start; padding:14px 6px; border-bottom:1px solid var(--line); }
  .toc .badge{ flex:none; width:34px; height:34px; border-radius:10px; display:flex; align-items:center;
    justify-content:center; font-weight:800; color:#fff;
    background:linear-gradient(160deg,var(--brand),var(--brand-dark)); font-size:15px; }
  .toc .t{ font-weight:700; color:var(--ink); }
  .toc .d{ color:var(--muted); font-size:12.5px; }

  /* ── Contenido ── */
  h2{ font-size:21px; color:var(--navy); margin:0 0 14px; padding:10px 0 10px 14px;
    border-left:5px solid var(--brand); background:linear-gradient(90deg,var(--tint),transparent);
    page-break-before:always; page-break-after:avoid; border-radius:0 8px 8px 0; }
  .flow > h2:first-child{ page-break-before:avoid; }
  h3{ font-size:15.5px; color:var(--brand-dark); margin:24px 0 8px; page-break-after:avoid; }
  h4{ page-break-after:avoid; }
  p,li{ font-size:13.5px; }
  a{ color:var(--brand); text-decoration:none; }
  strong{ color:#111827; }
  code{ background:#eef2f7; color:#334155; padding:1px 6px; border-radius:5px; font-size:12px;
    font-family:ui-monospace,"Cascadia Code",Consolas,monospace; }
  ul,ol{ padding-left:20px; }
  li{ margin:3px 0; }
  blockquote{ margin:16px 0; padding:12px 16px; background:var(--tint); border-left:4px solid var(--brand);
    border-radius:8px; color:#334155; page-break-inside:avoid; }
  blockquote p{ font-size:12.8px; margin:4px 0; }
  table{ border-collapse:separate; border-spacing:0; width:100%; margin:14px 0; font-size:12.5px;
    border:1px solid var(--line); border-radius:10px; overflow:hidden; page-break-inside:avoid; }
  th,td{ padding:8px 11px; text-align:left; vertical-align:top; border-bottom:1px solid var(--line); }
  th{ background:var(--navy); color:#fff; font-weight:600; }
  tr:nth-child(even) td{ background:var(--tint2); }
  tr:last-child td{ border-bottom:0; }

  /* Figura = imagen + pie, agrupados (no se parten entre páginas). */
  figure.fig{ margin:18px 0; text-align:center; page-break-inside:avoid; }
  figure.fig img{ max-width:100%; height:auto; border:1px solid var(--line); border-radius:10px;
    box-shadow:0 6px 18px rgba(15,23,42,.10); }
  figure.fig figcaption{ color:var(--muted); font-size:11.5px; margin-top:7px; }
  /* Fallback por si alguna imagen no tuviera pie. */
  p[align="center"]{ text-align:center; page-break-inside:avoid; margin:16px 0; }
  p[align="center"] img{ max-width:100%; height:auto; border:1px solid var(--line); border-radius:10px;
    box-shadow:0 6px 18px rgba(15,23,42,.10); }

  hr{ border:0; border-top:1px solid var(--line); margin:26px 0; }
</style>
</head>
<body>

  <section class="page cover">
    <img class="logo" src="img/ppv-logo.jpeg" alt="PPV">
    <div class="kicker">Federación de Psicólogos de Venezuela</div>
    <h1>Manual de usuario</h1>
    <div class="sub"><b>PPV</b> — Programa de Psicólogos Voluntarios</div>
    <div class="divider"></div>
    <p class="tag">Apoyo psicológico gratuito para personas afectadas por el terremoto · Venezuela.
       Guía por rol y guion de pruebas.</p>
    <div class="foot"><b>Documento para pruebas de la FPV</b> · ${FECHA}<br>
      <span style="font-size:11.5px;">Desarrollado por <b>ClutchDevs</b> · © ${YEAR} · Todos los derechos reservados</span></div>
  </section>

  <section class="page toc">
    <h2>Contenido</h2>
    <p class="lead">Este manual explica, paso a paso, qué puede hacer cada tipo de usuario.</p>
    <ol>
      ${toc
        .map(
          ([b, t, d, href]) =>
            `<li><span class="badge">${b}</span><div><a class="t" href="${href}">${t}</a><div class="d">${d}</div></div></li>`,
        )
        .join('\n      ')}
    </ol>
  </section>

  <main class="page flow">
${content}
  </main>

</body>
</html>
`;

const htmlPath = join(dir, 'manual-de-usuario.html');
writeFileSync(htmlPath, html);
console.log(`HTML: ${htmlPath}`);

// PDF con márgenes uniformes y numeración de páginas.
try {
  const { default: puppeteer } = await import('puppeteer');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle0', timeout: 60_000 });
  const footer = `<div style="font-size:8px;color:#9aa0aa;width:100%;padding:0 14mm;
    display:flex;justify-content:space-between;align-items:center;font-family:Segoe UI,Arial,sans-serif;">
    <span>© ${YEAR} <b style="color:#6b7280;">ClutchDevs</b> · PPV — Programa de Psicólogos Voluntarios</span>
    <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`;
  await page.pdf({
    path: join(dir, 'manual-de-usuario.pdf'),
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: footer,
    // Márgenes UNIFORMES en todas las páginas (arriba/abajo/lados) → nada pegado
    // al borde; el pie de página va en el margen inferior.
    margin: { top: '14mm', bottom: '16mm', left: '14mm', right: '14mm' },
  });
  await browser.close();
  console.log(`PDF:  ${join(dir, 'manual-de-usuario.pdf')}`);
} catch (e) {
  console.warn(`(PDF omitido: ${e.message}. Abre el HTML en Chrome → Imprimir → Guardar como PDF.)`);
}

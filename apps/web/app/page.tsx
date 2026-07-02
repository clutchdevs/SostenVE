import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Phone } from 'lucide-react';

/**
 * Landing redesigned for calm and clear visual hierarchy, aligned to the PPV
 * logo palette (blue/navy) for brand coherence. One protagonist CTA for people
 * seeking help; professional access, crisis and credits are visually demoted.
 * Same functionality and links — only layout, framing and color change.
 */
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-ppv-tint">
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      {/* Hero — logo framed as an intentional medallion, then a one-line promise. */}
      <header className="flex flex-col items-center text-center">
        <div className="rounded-[2rem] bg-white p-3 shadow-card ring-1 ring-ppv-navy/10">
          <Image
            src="/ppv-logo.jpeg"
            alt="PPV — Programa de Psicólogos Voluntarios"
            width={160}
            height={160}
            priority
            className="h-36 w-36 rounded-[1.4rem] object-contain"
          />
        </div>
        {/* The logo already shows the name; keep an accessible heading for semantics. */}
        <h1 className="sr-only">Programa de Psicólogos Voluntarios</h1>
        <p className="mt-6 text-base leading-relaxed text-slate-600">
          Apoyo psicológico gratuito para personas afectadas por el terremoto.
        </p>
      </header>

      {/* Primary CTA — the largest, most prominent element, in PPV blue. */}
      <Link
        href="/intake"
        className="mt-10 block rounded-2xl bg-ppv-blue px-6 py-5 text-center text-lg font-semibold text-white shadow-card transition-colors hover:bg-ppv-blue-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ppv-blue"
      >
        Necesito apoyo psicológico
      </Link>

      {/* Professional access — clearly secondary, lighter visual weight. */}
      <section className="mt-10 flex flex-col items-center text-center">
        <h2 className="text-sm font-semibold text-slate-500">¿Eres psicólogo?</h2>
        <Link
          href="/login"
          className="mt-3 block w-full rounded-2xl border border-slate-300 px-6 py-3.5 text-base font-medium text-ppv-navy transition-colors hover:border-ppv-blue hover:text-ppv-blue"
        >
          Ingresar como profesional
        </Link>
        <Link
          href="/registro"
          className="mt-3 text-sm text-slate-500 transition-colors hover:text-ppv-blue hover:underline"
        >
          Registrarme como psicólogo
        </Link>
      </section>

      {/* Emergency — visible in red, but not competing with the primary CTA. */}
      <section className="mt-10 flex flex-col items-center text-center">
        <h2 className="text-sm font-semibold text-slate-500">¿Es una emergencia?</h2>
        <Link
          href="/intake/roja"
          className="mt-2 inline-flex items-center gap-1.5 text-base font-semibold text-risk-high transition-opacity hover:opacity-80"
        >
          <Phone className="h-4 w-4" aria-hidden />
          Ver líneas de crisis
        </Link>
      </section>

      {/* Additional resources — quiet secondary link. */}
      <section className="mt-10 flex justify-center text-center">
        <Link
          href="/guias"
          className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-ppv-blue"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          <span>Guías de autoayuda (Primeros Auxilios Psicológicos)</span>
        </Link>
      </section>

      {/* Footer — muted credits, intentionally low emphasis. */}
      <footer className="mt-16 flex flex-col items-center gap-1.5 text-center">
        <p className="text-xs text-slate-400">Federación de Psicólogos de Venezuela</p>
        <a
          href="https://clutchdevs.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-ppv-navy"
        >
          <span>Desarrollado por</span>
          <Image
            src="/clutchdevs-logo.png"
            alt="ClutchDevs"
            width={14}
            height={14}
            className="opacity-70"
          />
          <span className="font-medium">ClutchDevs</span>
        </a>
      </footer>
      </div>
    </main>
  );
}

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Phone } from 'lucide-react';

/**
 * Landing redesigned for calm and clear visual hierarchy: a single protagonist
 * CTA for people seeking help, professional access demoted to a secondary
 * action, and crisis/resources/credits separated by generous whitespace. Same
 * functionality and links — only the layout and emphasis change.
 */
export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      {/* Hero — logo, name, one-line promise. Lots of breathing room. */}
      <header className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/10">
          <span className="font-serif text-2xl font-semibold tracking-wide text-brand">PPV</span>
        </div>
        <h1 className="mt-6 font-serif text-3xl font-semibold leading-tight text-ink">
          Programa de Psicólogos Voluntarios
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          Apoyo psicológico gratuito para personas afectadas por el terremoto.
        </p>
      </header>

      {/* Primary CTA — the largest, most prominent element on the screen. */}
      <Link
        href="/intake"
        className="mt-10 block rounded-2xl bg-brand px-6 py-5 text-center text-lg font-semibold text-white shadow-card transition-colors hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Necesito apoyo psicológico
      </Link>

      {/* Professional access — clearly secondary, lighter visual weight. */}
      <section className="mt-10 flex flex-col items-center text-center">
        <h2 className="text-sm font-semibold text-slate-500">¿Eres psicólogo?</h2>
        <Link
          href="/login"
          className="mt-3 block w-full rounded-2xl border border-slate-300 px-6 py-3.5 text-base font-medium text-ink transition-colors hover:border-brand hover:text-brand"
        >
          Ingresar como profesional
        </Link>
        <Link
          href="/registro"
          className="mt-3 text-sm text-slate-500 transition-colors hover:text-brand hover:underline"
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
          className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-brand"
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
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-navy"
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
    </main>
  );
}

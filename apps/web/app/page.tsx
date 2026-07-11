import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Phone } from 'lucide-react';

/**
 * Landing — a single centered column tuned to fit above the fold on laptops
 * (fix for issue #125: CTAs falling below the fold). Prominent brand lockup and
 * one-line promise, one protagonist CTA, professional access, and two compact
 * resource cards (emergency / self-help) side by side. Same links, calm hierarchy.
 */
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-ppv-tint">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-10 lg:max-w-4xl">
        {/* Brand lockup — logo sized close to the program-name text. */}
        <header className="flex items-center justify-center gap-3">
          <div className="rounded-2xl bg-white p-2 shadow-card ring-1 ring-ppv-navy/10">
            <Image
              src="/ppv-logo.jpeg"
              alt="PPV — Programa de Psicólogos Voluntarios"
              width={160}
              height={160}
              priority
              className="h-14 w-14 rounded-xl object-contain sm:h-16 sm:w-16"
            />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-extrabold leading-none text-ppv-navy sm:text-4xl">PPV</h1>
            <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              Psicólogos Voluntarios
            </p>
          </div>
        </header>

        {/* One-line promise — present but not shouting. */}
        <p className="mt-8 text-center text-xl font-semibold leading-snug text-ppv-navy sm:text-2xl">
          Apoyo psicológico gratuito para personas afectadas por el terremoto.
        </p>

        {/* Actions + resources — stacked on mobile, two columns on desktop to
            use the full width: CTAs on the left, resource shortcuts on the right. */}
        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-8">
          {/* Left column — primary CTA + professional access. */}
          <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none lg:flex-1">
            {/* Primary CTA — the protagonist action, in PPV blue. */}
            <Link
              href="/intake"
              className="block rounded-2xl bg-ppv-blue px-6 py-4 text-center text-lg font-semibold text-white shadow-card transition-colors hover:bg-ppv-blue-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ppv-blue"
            >
              Necesito apoyo psicológico
            </Link>

            {/* Professional access — clearly secondary. */}
            <Link
              href="/login"
              className="mt-3 block rounded-2xl border border-slate-300 px-6 py-3 text-center text-base font-medium text-ppv-navy transition-colors hover:border-ppv-blue hover:text-ppv-blue"
            >
              Ingresar como profesional
            </Link>
            <p className="mt-3 text-center text-sm text-slate-500">
              ¿Eres psicólogo?{' '}
              <Link href="/registro" className="font-semibold text-ppv-blue hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>

          {/* Right column — emergency (red life-safety signal) + self-help guides.
              Two-up on tablet, stacked inside the column on desktop. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex-1 lg:grid-cols-1">
            <Link
              href="/intake/roja"
              className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 transition-colors hover:border-risk-high/40"
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-risk-high text-white">
                <Phone className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-left">
                <span className="block text-xs font-semibold uppercase tracking-wide text-risk-high">
                  Emergencia
                </span>
                <span className="block font-semibold text-ppv-navy">Ver líneas de crisis</span>
              </span>
            </Link>

            <Link
              href="/guias"
              className="flex items-center gap-3 rounded-2xl border border-ppv-blue/15 bg-ppv-blue/5 p-4 transition-colors hover:border-ppv-blue/40"
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-ppv-blue text-white">
                <BookOpen className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-left">
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Recursos
                </span>
                <span className="block font-semibold text-ppv-navy">Guías de autoayuda</span>
              </span>
            </Link>
          </div>
        </div>

        {/* Footer — muted credits, intentionally low emphasis. */}
        <footer className="mt-8 flex flex-col items-center gap-1.5 text-center">
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

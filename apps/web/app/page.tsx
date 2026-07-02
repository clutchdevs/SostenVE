import Link from 'next/link';
import { ui } from '../src/lib/ui';

/**
 * Landing with two clear paths: a person seeking support, or staff (psychologist
 * / coordinator) signing in. The crisis line stays one tap away for emergencies.
 */
export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="text-center">
        <h1 className="font-serif text-4xl font-semibold text-brand">PPV</h1>
        <p className="mt-1 text-sm font-medium text-ink">Programa de Psicólogos Voluntarios</p>
        <p className={`mt-2 ${ui.muted}`}>
          Apoyo psicológico tras el terremoto · Federación de Psicólogos de Venezuela
        </p>
      </header>

      <nav className="space-y-3">
        <Link
          href="/intake"
          className="block rounded-2xl bg-brand px-5 py-4 text-center text-lg font-semibold text-white shadow-card transition-colors hover:bg-brand-dark"
        >
          Necesito apoyo psicológico
        </Link>
        <Link
          href="/login"
          className={`block px-5 py-4 text-center text-lg font-semibold text-ink transition-colors hover:bg-slate-50 ${ui.card}`}
        >
          Soy psicólogo o coordinador
        </Link>
        <Link href="/registro" className={`block text-center ${ui.link}`}>
          Registrarme como psicólogo
        </Link>
      </nav>

      <p className={`text-center ${ui.muted}`}>
        ¿Es una emergencia ahora?{' '}
        <Link href="/intake/roja" className="font-semibold text-risk-high underline">
          Ver líneas de crisis
        </Link>
      </p>

      <p className={`text-center ${ui.muted}`}>
        <Link href="/guias" className={`font-semibold ${ui.link}`}>
          Guías de autoayuda (Primeros Auxilios Psicológicos)
        </Link>
      </p>
    </main>
  );
}

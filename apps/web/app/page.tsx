import Link from 'next/link';

/**
 * Landing with two clear paths: a person seeking support, or staff (psychologist
 * / coordinator) signing in. The crisis line stays one tap away for emergencies.
 */
export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-brand">Sostén</h1>
        <p className="mt-2 text-slate-600">
          Apoyo psicológico tras el terremoto · Federación de Psicólogos de Venezuela
        </p>
      </header>

      <nav className="space-y-3">
        <Link
          href="/intake"
          className="block rounded-xl bg-brand px-5 py-4 text-center text-lg font-semibold text-white shadow-sm"
        >
          Necesito apoyo psicológico
        </Link>
        <Link
          href="/login"
          className="block rounded-xl border border-slate-300 bg-white px-5 py-4 text-center text-lg font-semibold text-slate-800 shadow-sm"
        >
          Soy psicólogo o coordinador
        </Link>
        <Link
          href="/registro"
          className="block text-center text-sm font-semibold text-brand underline"
        >
          Registrarme como psicólogo
        </Link>
      </nav>

      <p className="text-center text-sm text-slate-600">
        ¿Es una emergencia ahora?{' '}
        <Link href="/intake/roja" className="font-semibold text-risk-high underline">
          Ver líneas de crisis
        </Link>
      </p>

      <p className="text-center text-sm text-slate-600">
        <Link href="/guias" className="font-semibold text-brand underline">
          Guías de autoayuda (Primeros Auxilios Psicológicos)
        </Link>
      </p>
    </main>
  );
}
